import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ownerCredentials, startApi, type TestApi } from './support/api';

describe('login', () => {
	let api: TestApi;

	const login = async (username: string, password: string) => {
		const response = await api.post('/auth/login', { username, password });
		return { status: response.status, body: await response.json().catch(() => undefined), response };
	};

	beforeAll(async () => {
		api = await startApi();
		await api.createOwner();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('accepts the right password and returns the user', async () => {
		const { status, body } = await login(ownerCredentials.username, ownerCredentials.password);

		expect(status).toBe(200);
		expect(body).toEqual({ user: { userId: expect.any(String), username: 'owner', role: 'owner' } });
	});

	it('rejects a wrong password, and sets no cookie', async () => {
		const { status, body, response } = await login(ownerCredentials.username, 'wrong');

		expect(status).toBe(401);
		expect(body).toEqual({ code: 'unauthorized', message: 'Invalid username or password' });
		expect(response.headers.getSetCookie()).toEqual([]);
	});

	it('gives an unknown user the same answer as a wrong password', async () => {
		const unknown = await login('nobody', 'wrong');
		const wrong = await login(ownerCredentials.username, 'wrong');

		expect(unknown.status).toBe(wrong.status);
		expect(unknown.body).toEqual(wrong.body);
	});

	it('still compares a password for an unknown user, so that timing reveals no names', async () => {
		const fastest = async (username: string) => {
			const times: number[] = [];
			for (let attempt = 0; attempt < 3; attempt++) {
				const start = performance.now();
				await login(username, 'wrong');
				times.push(performance.now() - start);
			}
			return Math.min(...times);
		};

		// A real comparison takes tens of milliseconds, and no comparison takes about one.
		const wrongPassword = await fastest(ownerCredentials.username);
		const unknownUser = await fastest('nobody');

		expect(unknownUser).toBeGreaterThan(wrongPassword / 4);
	});

	it('requires a username and a password', async () => {
		const response = await api.post('/auth/login', { username: 'owner' });

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			code: 'invalid_request',
			message: 'The request is invalid',
			details: [{ path: 'password', message: 'Password must be non-empty text' }],
		});
	});

	it.each(['/register', '/authenticate', '/login'])('no longer serves POST %s', async (route) => {
		expect((await api.post(route, { username: 'sam', password: 'correct horse', token: 'x' })).status).toBe(404);
	});
});
