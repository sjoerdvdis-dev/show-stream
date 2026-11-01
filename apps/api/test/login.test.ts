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
		expect(body?.token).toBeUndefined();
	});

	it('rejects an unknown user', async () => {
		const { status } = await login('nobody', 'admin');

		expect(status).toBe(401);
	});

	it('requires a username and a password', async () => {
		const response = await api.post('/login', { username: 'admin' });

		expect(response.status).toBe(400);
		expect(await response.text()).toBe('Username and password are required');
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
	});

	it('requires a token', async () => {
		const response = await api.post('/authenticate', {});

		expect(response.status).toBe(400);
		expect(await response.text()).toBe('Token is required');
	});
});
