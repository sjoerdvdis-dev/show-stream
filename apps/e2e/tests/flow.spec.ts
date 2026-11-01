import { expect, test, type Page } from '@playwright/test';

const movieId = 550001;
const movieTitle = 'Demo Movie';
const unplayableMovieId = 550002;
const unplayableMovieTitle = 'Missing Video';

const logIn = async (page: Page, password = 'admin') => {
	await page.goto('/login');
	await page.getByLabel('Username').fill('admin');
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Login' }).click();
};

const logInAsAdmin = async (page: Page) => {
	await logIn(page);
	await page.waitForURL((url) => !url.pathname.startsWith('/login'));
};

test('a visitor with no session goes to login', async ({ page }) => {
	await page.goto('/dashboard/movies');

	await expect(page).toHaveURL(/\/login$/);
});

test('a wrong password stays on login with an error', async ({ page, context }) => {
	await logIn(page, 'wrong');

	await expect(page.getByText('Invalid username or password')).toBeVisible();
	await expect(page).toHaveURL(/\/login$/);
	expect((await context.cookies()).map((cookie) => cookie.name)).not.toContain('authToken');
});

test('logging in sets a session cookie that scripts cannot read', async ({ page, context }) => {
	await logInAsAdmin(page);

	const cookie = (await context.cookies()).find(({ name }) => name === 'authToken');
	expect(cookie?.httpOnly).toBe(true);
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
