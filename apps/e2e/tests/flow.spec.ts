import { expect, test, type Page } from '@playwright/test';

const owner = { username: 'owner', password: 'correct horse battery' };
const movieId = 550001;
const movieTitle = 'Demo Movie';
const unplayableMovieId = 550002;
const unplayableMovieTitle = 'Missing Video';
const corruptMovieId = 550003;
const corruptMovieTitle = 'Corrupt Movie';
const scannedMovieId = 550004;

/** A transcode or a scan runs in the worker, which takes a while for a real ffmpeg job. */
const workerTimeout = { timeout: 45_000 };

const logIn = async (page: Page, password = owner.password) => {
	await page.goto('/login');
	await page.getByLabel('Username').fill(owner.username);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Log in' }).click();
};

const logInAsOwner = async (page: Page) => {
	await logIn(page);
	await page.waitForURL('**/movies');
};

const grid = (page: Page) => page.getByRole('list', { name: 'Movies' });

/** Sonner's region, where every toast shows. */
const notifications = (page: Page) => page.getByRole('region', { name: /Notifications/ });

// Tests run in file order on one server, so this one finds the stack as a new install does,
// and every later test uses the owner it creates.
test('a fresh stack goes through setup to the library', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(/\/setup$/);

	await page.getByLabel('Username').fill(owner.username);
	await page.getByLabel('Password').fill('short');
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page.getByText('Password must have at least 8 characters')).toBeVisible();

	await page.getByLabel('Password').fill(owner.password);
	await page.getByRole('button', { name: 'Create account' }).click();

	await expect(page).toHaveURL(/\/movies$/);
	await expect(grid(page).getByRole('link', { name: movieTitle })).toBeVisible();
});

test('setup is gone once an owner exists', async ({ page }) => {
	await page.goto('/setup');

	await expect(page).toHaveURL(/\/login$/);
});

test('a page load with no session goes to login', async ({ page }) => {
	await page.goto('/movies');
	await expect(page).toHaveURL(/\/login\?redirect=%2Fmovies$/);

	await page.goto(`/watch/${movieId}`);
	await expect(page).toHaveURL(/\/login\?/);
});

test('a wrong password stays on login with an error', async ({ page, context }) => {
	await logIn(page, 'wrong password');

	await expect(page.getByText('Invalid username or password')).toBeVisible();
	await expect(page).toHaveURL(/\/login$/);
	expect((await context.cookies()).map((cookie) => cookie.name)).not.toContain('session');
});

test('logging in sets a session cookie that scripts cannot read', async ({ page, context }) => {
	await logInAsOwner(page);

	const cookie = (await context.cookies()).find(({ name }) => name === 'session');
	expect(cookie?.httpOnly).toBe(true);
	expect(cookie?.sameSite).toBe('Lax');
	expect(cookie?.secure).toBe(true);
});

test('a lost session returns to login, and logging in returns to the page', async ({ page, context }) => {
	await logInAsOwner(page);
	await page.goto(`/movies/${movieId}`);
	await expect(page.getByRole('heading', { level: 1, name: movieTitle })).toBeVisible();

	await context.clearCookies();
	await page.reload();
	await expect(page).toHaveURL(/\/login\?redirect=/);

	await page.getByLabel('Username').fill(owner.username);
	await page.getByLabel('Password').fill(owner.password);
	await page.getByRole('button', { name: 'Log in' }).click();

	await expect(page).toHaveURL(new RegExp(`/movies/${movieId}$`));
	await expect(page.getByRole('heading', { level: 1, name: movieTitle })).toBeVisible();
});

test("the movie page shows the movie's details", async ({ page }) => {
	await logInAsOwner(page);

	await grid(page).getByRole('link', { name: movieTitle }).click();

	await expect(page).toHaveURL(new RegExp(`/movies/${movieId}$`));
	await expect(page.getByRole('heading', { level: 1, name: movieTitle })).toBeVisible();
	const details = page.getByRole('list', { name: 'Details' });
	await expect(details).toContainText('2024');
	await expect(details).toContainText('Drama');
	await expect(page.getByText('A generated test clip.')).toBeVisible();
});

test('an unknown movie says it is not in the library', async ({ page }) => {
	await logInAsOwner(page);

	const response = page.waitForResponse((candidate) => candidate.url().endsWith('/api/movie/999999'));
	await page.goto('/movies/999999');

	expect((await response).status()).toBe(404);
	await expect(page.getByRole('heading', { name: 'This movie is not in the library' })).toBeVisible();
});

// The API answers a title with no folder with a 500 (issue #65), and the page says so.
test('a movie with no video says it cannot be played', async ({ page }) => {
	await logInAsOwner(page);
	await page.goto(`/movies/${unplayableMovieId}`);

	await page.getByRole('button', { name: `Play ${unplayableMovieTitle}` }).click();

	await expect(notifications(page).getByText(`Could not play ${unplayableMovieTitle}.`)).toBeVisible();
});

test('a corrupt movie shows why it failed, and can be retried', async ({ page }) => {
	await logInAsOwner(page);
	await page.goto(`/movies/${corruptMovieId}`);

	await page.getByRole('button', { name: `Play ${corruptMovieTitle}` }).click();

	const failed = notifications(page).getByText(`Playback preparation for ${corruptMovieTitle} failed.`);
	await expect(failed).toBeVisible(workerTimeout);
	const reason = page.getByRole('main').getByRole('alert').filter({ hasText: 'Preparing it failed' });
	await expect(reason).toContainText('Invalid data found');
	await expect(reason).not.toContainText('/media');

	// Reloading shows the failure again, and does not repeat the job.
	await page.reload();
	await expect(reason).toBeVisible();
	await expect(failed).toHaveCount(0);

	await page.getByRole('button', { name: `Retry ${corruptMovieTitle}` }).click();

	await expect(
		notifications(page).getByText(`Preparing ${corruptMovieTitle} again. You will be told when it is ready.`),
	).toBeVisible();
	await expect(failed).toBeVisible(workerTimeout);
	await expect(reason).toContainText('Invalid data found');
});

test('the notification socket upgrades to a WebSocket', async ({ page }) => {
	const socket = page.waitForEvent('websocket', {
		predicate: (webSocket) => webSocket.url().includes('socket'),
	});
	await logInAsOwner(page);

	expect((await socket).url()).toMatch(/^wss:\/\/caddy\/socket\//);
	expect((await socket).isClosed()).toBe(false);
});

test('a movie is prepared, says so through the socket, plays over HLS and seeks', async ({ page }) => {
	await logInAsOwner(page);
	await page.goto(`/movies/${movieId}`);

	await page.getByRole('button', { name: `Play ${movieTitle}` }).click();
	const ready = notifications(page).locator('[data-sonner-toast]', { hasText: `Playback for ${movieTitle} is ready!` });
	await expect(ready).toBeVisible(workerTimeout);

	await ready.getByRole('button', { name: 'Play' }).click();
	await expect(page).toHaveURL(new RegExp(`/watch/${movieId}$`));

	const video = page.locator('video');
	await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(3);

	const started = await video.evaluate(async (v: HTMLVideoElement) => {
		v.muted = true;
		await v.play();
		return v.currentTime;
	});
	await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(started);
	expect(await video.evaluate((v: HTMLVideoElement) => v.error)).toBeNull();

	await video.evaluate((v: HTMLVideoElement) => {
		v.currentTime = 15;
	});
	await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.seeking && v.currentTime >= 15)).toBe(true);
	await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(3);
});

// Follows the test above, which leaves the movie ready to play.
test('a stream that refuses the session returns to login', async ({ page }) => {
	await logInAsOwner(page);
	await page.route('**/streams/**', (route) => route.fulfill({ status: 401 }));

	await page.goto(`/watch/${movieId}`);

	await expect(page).toHaveURL(/\/login\?redirect=/);
});

// Follows the tests above, which leave one title ready and two failed.
test('a filter is kept in the URL, and survives a reload', async ({ page }) => {
	await logInAsOwner(page);

	await page.getByRole('button', { name: /^Filters/ }).click();
	const filters = page.getByRole('dialog', { name: 'Filters' });
	await filters.getByRole('group', { name: 'Status' }).getByRole('checkbox', { name: /Failed/ }).click();
	await page.keyboard.press('Escape');

	await expect(page).toHaveURL(/\/movies\?status=failed$/);
	await expect(grid(page).getByRole('link', { name: corruptMovieTitle })).toBeVisible();
	await expect(grid(page).getByRole('link', { name: movieTitle })).toHaveCount(0);

	await page.reload();

	await expect(page.getByRole('button', { name: 'Filters, 1 active' })).toBeVisible();
	await expect(grid(page).getByRole('link', { name: corruptMovieTitle })).toBeVisible();
	await expect(grid(page).getByRole('link', { name: movieTitle })).toHaveCount(0);
});

test('an owner scans the library and reads the result in Settings', async ({ page }) => {
	await logInAsOwner(page);
	await page.getByRole('link', { name: 'Settings' }).click();
	const section = page.getByRole('region', { name: 'Library' });
	await expect(section.getByText('No scan has run yet.')).toBeVisible();

	await section.getByRole('button', { name: 'Scan library' }).click();

	await expect(section.getByText(/^Last scan finished/)).toBeVisible(workerTimeout);
	await expect(section.getByRole('button', { name: 'Scan library' })).toBeEnabled();
	const count = (label: string) => section.locator('dl > div').filter({ has: page.getByText(label, { exact: true }) });
	await expect(count('Found')).toContainText('4');
	await expect(count('Added')).toContainText('1');
	await expect(count('Updated')).toContainText('2');
	await expect(count('Unmatched')).toContainText('1');
	await expect(section.getByRole('list', { name: 'Scan problems' })).toContainText(
		'Unknown Film (2024): TMDB has no match',
	);

	// The result outlives the page.
	await page.reload();
	await expect(section.getByText(/^Last scan finished/)).toBeVisible();
});

// Follows the scan, which stored the fake TMDB's art.
test('the library shows the art a scan stored', async ({ page }) => {
	const poster = page.waitForResponse((response) =>
		response.url().endsWith(`/api/library/movies/${scannedMovieId}/images/poster`),
	);

	await logInAsOwner(page);

	await expect(grid(page).getByRole('link', { name: 'Scanned Movie' })).toBeVisible();
	expect((await poster).status()).toBe(200);
	expect((await poster).headers()['content-type']).toBe('image/jpeg');
});

test('logging out from Settings ends the session at once', async ({ page, context }) => {
	await logInAsOwner(page);
	const [cookie] = (await context.cookies()).filter(({ name }) => name === 'session');

	await page.goto('/settings');
	await page.getByRole('region', { name: 'Account' }).getByRole('button', { name: 'Log out' }).click();

	await expect(page).toHaveURL(/\/login$/);
	expect((await context.cookies()).map(({ name }) => name)).not.toContain('session');

	// The API ended it, so the old cookie opens nothing.
	await context.addCookies([cookie!]);
	expect((await page.request.get('/api/auth/me')).status()).toBe(401);
	await page.goto('/movies');
	await expect(page).toHaveURL(/\/login\?/);
});
