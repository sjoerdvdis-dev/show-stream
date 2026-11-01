import { expect, test, type Page } from '@playwright/test';

const owner = { username: 'owner', password: 'correct horse battery' };
const movieId = 550001;
const movieTitle = 'Demo Movie';
const unplayableMovieId = 550002;
const unplayableMovieTitle = 'Missing Video';

const logIn = async (page: Page, password = owner.password) => {
	await page.goto('/login');
	await page.getByLabel('Username').fill(owner.username);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Login' }).click();
};

const logInAsAdmin = async (page: Page) => {
	await logIn(page);
	await page.waitForURL((url) => url.pathname.startsWith('/dashboard'));
};

// Tests run in file order on one server, so this one finds the stack as a new install does,
// and every later test uses the owner it creates.
test('a fresh stack goes through setup to the library', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(/\/setup$/);

	await page.getByLabel('Username').fill(owner.username);
	await page.getByLabel('Password').fill('short');
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page.getByText('Use at least 8 characters')).toBeVisible();

	await page.getByLabel('Password').fill(owner.password);
	await page.getByRole('button', { name: 'Create account' }).click();
	await page.waitForURL((url) => url.pathname.startsWith('/dashboard'));

	await page.goto('/dashboard/movies');
	await expect(page.getByText(movieTitle).first()).toBeVisible();
});

test('setup is gone once an owner exists', async ({ page }) => {
	await page.goto('/setup');

	await expect(page).toHaveURL(/\/login$/);
});

test('a page load with no session goes to login', async ({ page }) => {
	await page.goto('/dashboard/movies');
	await expect(page).toHaveURL(/\/login$/);

	await page.goto(`/video/${movieId}`);
	await expect(page).toHaveURL(/\/login$/);
});

test('a wrong password stays on login with an error', async ({ page, context }) => {
	await logIn(page, 'wrong');

	await expect(page.getByText('Invalid username or password')).toBeVisible();
	await expect(page).toHaveURL(/\/login$/);
	expect((await context.cookies()).map((cookie) => cookie.name)).not.toContain('session');
});

test('logging in sets a session cookie that scripts cannot read', async ({ page, context }) => {
	await logInAsAdmin(page);

	const cookie = (await context.cookies()).find(({ name }) => name === 'session');
	expect(cookie?.httpOnly).toBe(true);
	expect(cookie?.sameSite).toBe('Lax');
});

test('logging out ends the session at once', async ({ page, context }) => {
	await logInAsAdmin(page);
	const [cookie] = (await context.cookies()).filter(({ name }) => name === 'session');

	await page.goto('/dashboard/settings');
	await page.getByRole('button', { name: 'Log out' }).click();

	await expect(page).toHaveURL(/\/login$/);
	expect((await context.cookies()).map(({ name }) => name)).not.toContain('session');

	// The API ended it, so the old cookie opens nothing.
	await context.addCookies([cookie!]);
	expect((await page.request.get('/api/movies')).status()).toBe(401);
	await page.goto('/dashboard/movies');
	await expect(page).toHaveURL(/\/login$/);
});

test('a session that ends during use returns to login', async ({ page, context }) => {
	await logInAsAdmin(page);
	await page.goto('/dashboard/movies');
	await expect(page.getByText(movieTitle).first()).toBeVisible();

	await context.clearCookies();

	await expect(page).toHaveURL(/\/login$/);
});

test('the library shows the seeded movie', async ({ page }) => {
	await logInAsAdmin(page);

	await page.goto('/dashboard/movies');

	await expect(page.getByText(movieTitle).first()).toBeVisible();
});

test('the detail page shows the movie', async ({ page }) => {
	await logInAsAdmin(page);

	await page.goto(`/dashboard/movies/${movieId}`);

	await expect(page.getByRole('heading', { name: movieTitle })).toBeVisible();
});

test('an unknown movie does not crash the detail page', async ({ page }) => {
	await logInAsAdmin(page);

	const response = page.waitForResponse((candidate) => candidate.url().endsWith('/api/movie/999999'));
	await page.goto('/dashboard/movies/999999');

	expect((await response).status()).toBe(404);

	// The page keeps its spinner. If it read the error body as a movie, Next's crash page would replace it.
	await page.waitForTimeout(2_000);
	await expect(page.locator('.animate-spin')).toBeVisible();
});

test('a movie that cannot be prepared says so', async ({ page }) => {
	await logInAsAdmin(page);
	await page.goto(`/dashboard/movies/${unplayableMovieId}`);

	await page.getByRole('button', { name: 'Play' }).click();

	await expect(page.getByText(`Playback preparation for ${unplayableMovieTitle} failed.`)).toBeVisible();
});

test('the notification socket upgrades to a WebSocket', async ({ page }) => {
	await logInAsAdmin(page);

	const socket = page.waitForEvent('websocket', {
		predicate: (webSocket) => webSocket.url().includes('socket'),
	});
	await page.goto(`/dashboard/movies/${movieId}`);

	expect((await socket).isClosed()).toBe(false);
});

test('a movie is prepared, plays over HLS and seeks', async ({ page }) => {
	await logInAsAdmin(page);
	await page.goto(`/dashboard/movies/${movieId}`);

	await page.getByRole('button', { name: 'Play' }).click();
	await expect(page.getByText(`Playback for ${movieTitle} is ready!`)).toBeVisible({ timeout: 45_000 });

	await page.getByRole('link', { name: 'Play' }).click({ timeout: 15_000 });
	await page.waitForURL(`**/video/${movieId}`);

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
	await logInAsAdmin(page);
	await page.route('**/api/streams/**', (route) => route.fulfill({ status: 401 }));

	await page.goto(`/video/${movieId}`);

	await expect(page).toHaveURL(/\/login$/);
});
