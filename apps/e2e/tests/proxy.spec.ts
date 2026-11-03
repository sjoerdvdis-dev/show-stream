import { expect, test, type APIRequestContext } from '@playwright/test';

// Runs after flow.spec.ts, which creates the owner and leaves the movie ready to play. Caddy
// serves the app's files itself, and only the API answers anything else, so an answer here is
// either Caddy's or the API's, with no Node server between.

const owner = { username: 'owner', password: 'correct horse battery' };
const movieId = 550001;

/** The path of the app's stylesheet, a hashed asset large enough to compress, from the page that loads it. */
const stylesheetPath = async (request: APIRequestContext) => {
	const html = await (await request.get('/')).text();
	return /<link rel="stylesheet"[^>]* href="(\/assets\/[^"]+\.css)"/.exec(html)![1]!;
};

test('port 80 redirects to HTTPS', async ({ request }) => {
	const response = await request.get('http://caddy/login?next=1', { maxRedirects: 0 });

	expect(response.status()).toBe(308);
	expect(response.headers().location).toBe('https://caddy/login?next=1');
});

test('Caddy serves the app itself, as static files', async ({ request }) => {
	for (const path of ['/', '/login', `/movies/${movieId}?status=ready`]) {
		const response = await request.get(path);

		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toBe('text/html; charset=utf-8');
		expect(response.headers().server).toBe('Caddy');
		expect(response.headers()['x-powered-by']).toBeUndefined();
		expect(await response.text()).toContain('<div id="root"></div>');
	}
});

test('index.html is asked for again each time, and hashed assets are kept', async ({ request }) => {
	const page = await request.get('/movies');
	expect(page.headers()['cache-control']).toBe('no-cache');

	const asset = await request.get(await stylesheetPath(request), { headers: { 'Accept-Encoding': 'gzip, zstd' } });
	expect(asset.status()).toBe(200);
	expect(asset.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
	expect(asset.headers()['content-encoding']).toBeDefined();

	// A missing asset is not the app, so that no stale page is kept under an asset's name.
	const missing = await request.get('/assets/missing-0000.js');
	expect(missing.status()).toBe(404);
	expect(missing.headers()['cache-control']).toBe('no-cache');
});

test("the app's responses send the security headers and the policy", async ({ request }) => {
	const response = await request.get('/');
	const headers = response.headers();

	expect(headers['x-content-type-options']).toBe('nosniff');
	expect(headers['referrer-policy']).toBe('same-origin');
	expect(headers['strict-transport-security']).toBeUndefined();
	const policy = headers['content-security-policy']!.split('; ');
	expect(policy).toContain("default-src 'self'");
	expect(policy).toContain("connect-src 'self'");
	expect(policy).toContain("frame-ancestors 'none'");
	expect(policy.find((directive) => directive.startsWith('script-src'))).toMatch(
		/^script-src 'self' 'sha256-[A-Za-z0-9+/]+=*'$/,
	);
});

test('the app runs under its policy with no violation, from login to playback', async ({ page }) => {
	const violations: string[] = [];
	page.on('console', (message) => {
		if (/Content Security Policy|Content-Security-Policy/i.test(message.text())) violations.push(message.text());
	});
	await page.addInitScript(() => {
		document.addEventListener('securitypolicyviolation', (event) => {
			console.error(`Content Security Policy violation: ${event.violatedDirective} ${event.blockedURI}`);
		});
	});
	// The first-paint script applies the stored theme before the app does.
	await page.addInitScript(() => localStorage.setItem('theme', 'dark'));

	await page.goto('/login');
	await expect(page.locator('html')).toHaveClass(/\bdark\b/);
	await page.getByLabel('Username').fill(owner.username);
	await page.getByLabel('Password').fill(owner.password);
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page.getByRole('list', { name: 'Movies' }).getByRole('link').first()).toBeVisible();

	await page.goto(`/movies/${movieId}`);
	await expect(page.getByRole('heading', { level: 1, name: 'Demo Movie' })).toBeVisible();

	await page.goto(`/watch/${movieId}`);
	const video = page.locator('video');
	await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(3);

	await page.goto('/settings');
	await expect(page.getByRole('region', { name: 'Library' })).toBeVisible();

	expect(violations).toEqual([]);
});

test('a deep link loads on reload', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Username').fill(owner.username);
	await page.getByLabel('Password').fill(owner.password);
	await page.getByRole('button', { name: 'Log in' }).click();
	await page.waitForURL('**/movies');

	await page.goto(`/movies/${movieId}`);
	await page.reload();

	await expect(page.getByRole('heading', { level: 1, name: 'Demo Movie' })).toBeVisible();
});

test('/api reaches the API with its prefix removed', async ({ request }) => {
	const response = await request.get('/api/auth/setup');

	expect(await response.json()).toEqual({ needed: false });
	expect(response.headers()['strict-transport-security']).toBeUndefined();
});

test('/socket reaches the API', async ({ request }) => {
	const response = await request.get('/socket/?EIO=4&transport=polling');

	expect(response.status()).toBe(200);
	expect(await response.text()).toMatch(/^0\{"sid":/);
});

test('/streams reaches the API, which refuses it with no session', async ({ request }) => {
	const response = await request.get(`/streams/${movieId}/playlist.m3u8`);

	expect(response.status()).toBe(401);
	expect((await response.json()).code).toBe('unauthorized');
});

test('streams are not compressed, while the rest of the API is', async ({ request }) => {
	await request.post('/api/auth/login', { data: owner });
	const headers = { 'Accept-Encoding': 'gzip, zstd' };

	const compressed = async (url: string) => {
		const response = await request.get(url, { headers });
		expect(response.ok()).toBe(true);
		return response.headers()['content-encoding'];
	};

	expect(await compressed(`/streams/${movieId}/playlist.m3u8`)).toBeUndefined();
	expect(await compressed('/api/movies')).toBeDefined();
});

// Last in the run: it uses up this address's failed logins, so that no later login could pass.
test('a spoofed X-Forwarded-For does not escape the login limit', async ({ page, request }) => {
	const failLogin = (attempt: number) =>
		request.post('/api/auth/login', {
			data: { username: owner.username, password: 'wrong' },
			headers: { 'X-Forwarded-For': `203.0.113.${attempt}` },
		});

	// Each attempt claims a new address. flow.spec.ts has already failed one from this one.
	for (let attempt = 1; attempt <= 10; attempt += 1) {
		await failLogin(attempt);
	}

	expect((await failLogin(11)).status()).toBe(429);

	// The login screen says so, and the right password is refused too.
	await page.goto('/login');
	await page.getByLabel('Username').fill(owner.username);
	await page.getByLabel('Password').fill(owner.password);
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page.getByText(/too many/i)).toBeVisible();
	await expect(page).toHaveURL(/\/login$/);
});
