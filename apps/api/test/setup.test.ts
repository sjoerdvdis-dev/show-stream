import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ownerCredentials, startApi, type TestApi } from './support/api';

describe('first-run setup', () => {
	let api: TestApi;

	const setupNeeded = async () => (await (await api.get('/auth/setup')).json()).needed;

	beforeEach(async () => {
		api = await startApi();
	});

	afterEach(async () => {
		await api?.stop();
	});

	it('is needed on a new database, which has no default account', async () => {
		expect(await setupNeeded()).toBe(true);
		expect((await api.post('/auth/login', { username: 'admin', password: 'admin' })).status).toBe(401);
	});

	it('creates the owner and logs them in', async () => {
		const response = await api.post('/auth/setup', ownerCredentials);

		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({ user: { userId: expect.any(String), username: 'owner', role: 'owner' } });
		expect(response.headers.getSetCookie()).toEqual([expect.stringMatching(/^session=/)]);
		expect(await setupNeeded()).toBe(false);
	});

	it('is refused once an owner exists', async () => {
		await api.createOwner();

		const response = await api.post('/auth/setup', { username: 'second', password: 'correct horse' });

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ code: 'conflict', message: 'Setup has already been completed' });
		expect((await api.post('/auth/login', { username: 'second', password: 'correct horse' })).status).toBe(401);
	});

	it('lets only one of two simultaneous setups win', async () => {
		const attempts = await Promise.all(
			['first', 'second', 'third', 'fourth'].map((username) =>
				api.post('/auth/setup', { username, password: 'correct horse' }),
			),
		);

		expect(attempts.map(({ status }) => status).sort()).toEqual([201, 409, 409, 409]);
	});

	it('requires a password of at least 8 characters', async () => {
		const response = await api.post('/auth/setup', { username: 'owner', password: '1234567' });

		expect(response.status).toBe(400);
		expect(await setupNeeded()).toBe(true);
	});
});
