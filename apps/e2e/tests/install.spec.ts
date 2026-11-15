import { expect, test, type APIRequestContext, type Page, type Response } from '@playwright/test';

// Runs after flow.spec.ts, which creates the owner and leaves the movie ready to play, and before
// proxy.spec.ts, whose last test uses up the login limit. Each test has a new browser context, so
// the service worker installs anew in each.

const owner = { username: 'owner', password: 'correct horse battery' };
const movieId = 550001;

/** The service worker may answer nothing under these: they are the server's. */
const serverPath = /^https:\/\/caddy\/(api|socket|streams)\//;

/** Collects every Content-Security-Policy violation the page reports. */
const watchPolicy = async (page: Page) => {
	const violations: string[] = [];
	page.on('console', (message) => {
		if (/Content Security Policy|Content-Security-Policy/i.test(message.text())) violations.push(message.text());
	});
	await page.addInitScript(() => {
		document.addEventListener('securitypolicyviolation', (event) => {
			console.error(`Content Security Policy violation: ${event.violatedDirective} ${event.blockedURI}`);
		});
	});
	return violations;
};

/** Loads the app, waits for its service worker, and reloads, so that the worker controls the page. */
const openControlled = async (page: Page, path = '/login') => {
	await page.goto(path);
	await expect
		.poll(() =>
			page.evaluate(async () => {
				const registration = await navigator.serviceWorker.getRegistration();
				return registration?.active?.state ?? 'not registered';
			}),
		)
		.toBe('activated');
	await page.reload();
	await expect
		.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL))
		.toBe('https://caddy/sw.js');
};

const logIn = async (page: Page) => {
	await page.getByLabel('Username').fill(owner.username);
	await page.getByLabel('Password').fill(owner.password);
	await page.getByRole('button', { name: 'Log in' }).click();
	await page.waitForURL('**/movies');
};

/** The width and height a PNG says it has, from its header. */
const pngSize = (body: Uint8Array) => {
	const header = new DataView(body.buffer, body.byteOffset, body.byteLength);
	return { width: header.getUint32(16), height: header.getUint32(20) };
};

const expectPng = async (request: APIRequestContext, path: string, size: number) => {
	const response = await request.get(path);
	expect(response.status(), path).toBe(200);
	expect(response.headers()['content-type']).toBe('image/png');
	expect(pngSize(await response.body())).toEqual({ width: size, height: size });
};

test('the page links a valid manifest, whose icons load', async ({ page, request }) => {
	const violations = await watchPolicy(page);
	await page.goto('/login');

	const href = await page.locator('link[rel="manifest"]').getAttribute('href');
	const response = await request.get(href!);
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toMatch(/^application\/manifest\+json\b/);

	const manifest = await response.json();
	expect(manifest).toMatchObject({
		id: '/',
		name: 'ShowStream',
		start_url: '/',
		scope: '/',
		display: 'standalone',
		theme_color: expect.stringMatching(/^#[0-9a-f]{6}$/),
		background_color: expect.stringMatching(/^#[0-9a-f]{6}$/),
	});
	const icons = manifest.icons as { src: string; sizes: string; type: string; purpose: string }[];
	expect(icons.map(({ sizes, purpose }) => `${sizes} ${purpose}`)).toEqual([
		'192x192 any',
		'512x512 any',
		'512x512 maskable',
	]);
	for (const icon of icons) {
		expect(icon.type).toBe('image/png');
		await expectPng(request, icon.src, Number(icon.sizes.split('x')[0]));
	}

	await expectPng(request, (await page.locator('link[rel="apple-touch-icon"]').getAttribute('href'))!, 180);
	await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', /^#[0-9a-f]{6}$/);
	expect(violations).toEqual([]);
});

test('the service worker and the manifest are asked for again each time', async ({ request }) => {
	const worker = await request.get('/sw.js');
	expect(worker.status()).toBe(200);
	expect(worker.headers()['content-type']).toMatch(/^text\/javascript\b/);
	expect(worker.headers()['cache-control']).toBe('no-cache');

	// The worker loads Workbox from a file beside it, whose name it holds.
	const runtime = /"\.\/(workbox-[\w-]+)"/.exec(await worker.text())![1]!;
	const workbox = await request.get(`/${runtime}.js`);
	expect(workbox.status()).toBe(200);
	expect(workbox.headers()['cache-control']).toBe('no-cache');

	const manifest = await request.get('/manifest.webmanifest');
	expect(manifest.headers()['cache-control']).toBe('no-cache');
});

test('a service worker registers, and serves the shell after a reload', async ({ page }) => {
	const violations = await watchPolicy(page);
	const fromWorker: string[] = [];
	page.on('response', (response) => {
		if (response.fromServiceWorker()) fromWorker.push(new URL(response.url()).pathname);
	});

	await openControlled(page);

	await expect(page.getByRole('heading', { name: 'Log in to ShowStream' })).toBeVisible();
	expect(fromWorker).toContain('/login');
	expect(fromWorker.some((path) => /^\/assets\/.+\.js$/.test(path))).toBe(true);
	expect(violations).toEqual([]);
});

test('during playback, the API and the streams are answered by the network', async ({ page }) => {
	const violations = await watchPolicy(page);
	const serverResponses: Response[] = [];
	page.on('response', (response) => {
		if (serverPath.test(response.url())) serverResponses.push(response);
	});

	await openControlled(page);
	await logIn(page);
	await page.goto(`/watch/${movieId}`);
	await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

	const video = page.locator('video');
	await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(3);
	const started = await video.evaluate(async (v: HTMLVideoElement) => {
		v.muted = true;
		await v.play();
		return v.currentTime;
	});
	await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(started);

	const paths = serverResponses.map((response) => new URL(response.url()).pathname);
	expect(paths).toContain('/api/auth/me');
	expect(paths.some((path) => /^\/streams\/.+\.ts$/.test(path))).toBe(true);
	expect(serverResponses.filter((response) => response.fromServiceWorker()).map((response) => response.url())).toEqual(
		[],
	);

	// Nothing of the server's was kept, in any cache.
	const cached = await page.evaluate(async () => {
		const urls: string[] = [];
		for (const name of await caches.keys()) {
			const cache = await caches.open(name);
			urls.push(...(await cache.keys()).map((request) => request.url));
		}
		return urls;
	});
	expect(cached.length).toBeGreaterThan(0);
	expect(cached.filter((url) => serverPath.test(url))).toEqual([]);
	expect(violations).toEqual([]);
});

test('with no network, the shell loads from the worker and says it cannot reach the server', async ({
	page,
	context,
}) => {
	const violations = await watchPolicy(page);
	await openControlled(page);

	await context.setOffline(true);
	await page.goto('/movies');

	const unreachable = page.getByRole('alert');
	await expect(unreachable.getByRole('heading', { name: 'Cannot reach the server' })).toBeVisible();
	await expect(page).toHaveURL(/\/movies$/);

	await context.setOffline(false);
	await unreachable.getByRole('button', { name: 'Retry' }).click();
	await expect(page.getByRole('heading', { name: 'Log in to ShowStream' })).toBeVisible();
	expect(violations).toEqual([]);
});
