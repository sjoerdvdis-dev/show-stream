import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ownerCredentials, startApi, type TestApi, type TestClient } from './support/api';

const allowedFailures = 10;

describe('the rate limit on login and setup', () => {
	let api: TestApi;

	const fromAddress = (address: string) => ({ 'x-forwarded-for': address });

	const failLogins = async (count: number, address: string) => {
		for (let attempt = 0; attempt < count; attempt++) {
			const response = await api.post(
				'/auth/login',
				{ username: ownerCredentials.username, password: 'wrong' },
				fromAddress(address),
			);
			expect(response.status).toBe(401);
		}
	};

	beforeEach(async () => {
		api = await startApi();
		await api.createOwner();
	});

	afterEach(async () => {
		await api?.stop();
	});

	it('stops an address after too many failures, even with the right password', async () => {
		await failLogins(allowedFailures, '203.0.113.1');

		const response = await api.post('/auth/login', ownerCredentials, fromAddress('203.0.113.1'));

		expect(response.status).toBe(429);
		expect(await response.json()).toEqual({ code: 'rate_limited', message: 'Too many attempts. Try again later' });
		expect(response.headers.get('ratelimit')).not.toBeNull();
	});

	it('counts setup as well', async () => {
		await failLogins(allowedFailures, '203.0.113.2');

		const response = await api.post('/auth/setup', ownerCredentials, fromAddress('203.0.113.2'));

		expect(response.status).toBe(429);
	});

	it('leaves other addresses alone', async () => {
		await failLogins(allowedFailures, '203.0.113.3');

		expect((await api.post('/auth/login', ownerCredentials, fromAddress('203.0.113.4'))).status).toBe(200);
	});

	it('does not count successful logins', async () => {
		for (let attempt = 0; attempt <= allowedFailures; attempt++) {
			expect((await api.post('/auth/login', ownerCredentials, fromAddress('203.0.113.5'))).status).toBe(200);
		}
	});

	it('trusts one proxy hop, so that a client cannot escape by adding to X-Forwarded-For', async () => {
		await failLogins(allowedFailures, '203.0.113.6');

		const response = await api.post('/auth/login', ownerCredentials, fromAddress('192.0.2.1, 203.0.113.6'));

		expect(response.status).toBe(429);
	});

	it('leaves other routes alone', async () => {
		await failLogins(allowedFailures + 1, '203.0.113.7').catch(() => undefined);

		expect((await api.get('/auth/setup', fromAddress('203.0.113.7'))).status).toBe(200);
	});
});

describe('the Origin check', () => {
	let api: TestApi;
	let owner: TestClient;

	beforeEach(async () => {
		api = await startApi();
		owner = await api.createOwner();
	});

	afterEach(async () => {
		await api?.stop();
	});

	it.each(['https://evil.example', 'null', 'not a url'])('refuses a non-GET request from %s', async (origin) => {
		const response = await api.post('/auth/login', ownerCredentials, { origin });

		expect(response.status).toBe(403);
		expect((await response.json()).code).toBe('forbidden');
	});

	it('refuses it even with a valid session, and changes nothing', async () => {
		const response = await owner.post('/auth/logout', {}, { origin: 'https://evil.example' });

		expect(response.status).toBe(403);
		expect((await owner.get('/auth/me')).status).toBe(200);
	});

	it('accepts an Origin that matches the host', async () => {
		expect((await api.post('/auth/login', ownerCredentials, { origin: api.url })).status).toBe(200);
	});

	it('compares with the host the proxy was asked for, so that any domain or LAN address works', async () => {
		const proxied = { 'x-forwarded-host': 'media.example:8443' };

		const match = await api.post('/auth/login', ownerCredentials, { ...proxied, origin: 'https://media.example:8443' });
		const mismatch = await api.post('/auth/login', ownerCredentials, { ...proxied, origin: api.url });

		expect(match.status).toBe(200);
		expect(mismatch.status).toBe(403);
	});

	it('accepts a request with no Origin', async () => {
		expect((await api.post('/auth/login', ownerCredentials)).status).toBe(200);
	});

	it('does not apply to GET requests', async () => {
		expect((await owner.get('/auth/me', { origin: 'https://evil.example' })).status).toBe(200);
	});
});
