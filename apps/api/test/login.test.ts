import { setTimeout as sleep } from 'node:timers/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, type TestApi } from './support/api';

describe('login', () => {
	let api: TestApi;

	const login = async (username: string, password: string) => {
		const response = await api.post('/login', { username, password });
		return { status: response.status, body: await response.json().catch(() => undefined) };
	};

	beforeAll(async () => {
		api = await startApi();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('accepts the default account and returns a token', async () => {
		const { status, body } = await login('admin', 'admin');

		expect(status).toBe(200);
		expect(body.token).toEqual(expect.any(String));
	});

	it('rejects a wrong password', async () => {
		const { status, body } = await login('admin', 'wrong');

		expect(status).toBe(401);
		expect(body).toEqual({ code: 'unauthorized', message: 'Invalid username or password' });
	});

	it('rejects an unknown user', async () => {
		const { status } = await login('nobody', 'admin');

		expect(status).toBe(401);
	});

	it('requires a username and a password', async () => {
		const response = await api.post('/login', { username: 'admin' });

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			code: 'invalid_request',
			message: 'The request is invalid',
			details: [{ path: 'password', message: 'Password must be non-empty text' }],
		});
	});

	it('registers a user who can then log in', async () => {
		const response = await api.post('/register', { username: 'sam', password: 'correct horse' });

		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({ success: true });
		expect((await login('sam', 'correct horse')).status).toBe(200);
	});

	it('does not register a username twice', async () => {
		await api.post('/register', { username: 'twice', password: 'first' });
		const response = await api.post('/register', { username: 'twice', password: 'second' });

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ code: 'internal_error', message: 'Something went wrong' });
		expect((await login('twice', 'first')).status).toBe(200);
		expect((await login('twice', 'second')).status).toBe(401);
	});

	it('confirms a token it issued, with its user', async () => {
		const { body } = await login('admin', 'admin');

		const response = await api.post('/authenticate', { token: body.token });

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ valid: true, user: { username: 'admin' } });
	});

	it('rejects an invalid token', async () => {
		const response = await api.post('/authenticate', { token: 'not-a-token' });

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ code: 'unauthorized', message: 'Invalid token' });
	});

	// Startup finds the account already there. The pause covers the work startup does after it serves.
	it('keeps running after a restart with the default account in place', async () => {
		await api.restart();
		await sleep(1_000);

		await api.waitFor(async () => expect((await login('admin', 'admin')).status).toBe(200));
	});

	it('requires a token', async () => {
		const response = await api.post('/authenticate', {});

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			code: 'invalid_request',
			details: [{ path: 'token', message: 'Token must be non-empty text' }],
		});
	});
});
