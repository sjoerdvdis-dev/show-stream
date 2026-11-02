import { expect, test } from '@playwright/test';

// Runs after flow.spec.ts, which creates the owner and leaves the movie ready to play. A built
// Next client has no route to the API, so an answer from the API here came straight from Caddy.

const owner = { username: 'owner', password: 'correct horse battery' };
const movieId = 550001;

test('port 80 redirects to HTTPS', async ({ request }) => {
	const response = await request.get('http://caddy/login?next=1', { maxRedirects: 0 });

	expect(response.status()).toBe(308);
	expect(response.headers().location).toBe('https://caddy/login?next=1');
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
	expect(await compressed(`/api/streams/${movieId}/playlist.m3u8`)).toBeUndefined();
	expect(await compressed('/api/movies')).toBeDefined();
});

// Last in the run: it uses up this address's failed logins, so that no later login could pass.
test('a spoofed X-Forwarded-For does not escape the login limit', async ({ request }) => {
	const failLogin = (attempt: number) =>
		request.post('/api/auth/login', {
			data: { username: owner.username, password: 'wrong' },
			headers: { 'X-Forwarded-For': `203.0.113.${attempt}` },
		});

	// Each attempt claims a new address. flow.spec.ts has already failed some from this one.
	for (let attempt = 1; attempt <= 10; attempt += 1) {
		await failLogin(attempt);
	}

	expect((await failLogin(11)).status()).toBe(429);
});
