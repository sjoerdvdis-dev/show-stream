import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiErrorSchema } from '@workspace/contract/errors';
import { startApi, type TestApi, type TestClient } from './support/api';

describe('malformed requests', () => {
	let api: TestApi;
	let owner: TestClient;

	const expectStillUp = async () => {
		expect((await owner.get('/movies')).status).toBe(200);
	};

	const postRaw = (route: string, contentType: string, body: string) =>
		fetch(`${api.url}${route}`, { method: 'POST', headers: { 'content-type': contentType }, body });

	beforeAll(async () => {
		api = await startApi();
		owner = await api.createOwner();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('finding 8: a malformed stream URL is rejected and the API stays up', async () => {
		const response = await owner.get('/streams/abc/x.ts');

		expect(response.status).toBe(400);
		await expectStillUp();
	});

	it('finding 9: login rejects a query operator as the username', async () => {
		const response = await api.post('/auth/login', { username: { $ne: null }, password: 'admin' });

		expect(response.status).toBe(400);
		await expectStillUp();
	});

	it('rejects a query operator in a form body as well', async () => {
		const response = await postRaw(
			'/auth/login',
			'application/x-www-form-urlencoded',
			'username[$ne]=nobody&password=admin',
		);

		expect(response.status).toBe(400);
	});

	it.each([
		'/movie/abc',
		'/movie/1.5',
		'/movie/-1',
		'/movie/0x10',
		'/movie/1e3',
		'/movie/Infinity',
		'/movie/99999999999999999999',
		'/transcode/request/abc',
		'/transcode/playlist/abc',
		'/streams/abc/playlist.m3u8',
		'/streams/1/clip.mp4',
		'/streams/1/..%2Fplaylist.m3u8',
		'/streams/1/.m3u8',
	])('rejects GET %s with field details', async (route) => {
		const response = await owner.get(route);

		expect(response.status).toBe(400);
		const body = apiErrorSchema.parse(await response.json());
		expect(body.code).toBe('invalid_request');
		expect(body.details?.length).toBeGreaterThan(0);
		await expectStillUp();
	});

	it.each([
		['/auth/setup', { username: 'someone' }],
		['/auth/setup', { username: '', password: 'long enough' }],
		['/auth/setup', { username: 'someone', password: ['long enough'] }],
		['/auth/setup', { username: 'someone', password: 'short' }],
		['/auth/login', {}],
		['/auth/login', { username: 1, password: 2 }],
	])('rejects POST %s with %j', async (route, body) => {
		const response = await api.post(route, body);

		expect(response.status).toBe(400);
		expect(apiErrorSchema.parse(await response.json()).code).toBe('invalid_request');
	});

	it('names every bad field', async () => {
		const response = await api.post('/auth/login', {});

		const { details } = apiErrorSchema.parse(await response.json());
		expect(details?.map(({ path }) => path)).toEqual(['username', 'password']);
	});

	it('never repeats a submitted value', async () => {
		const response = await api.post('/auth/login', { username: 'admin', password: { secret: 'do-not-echo' } });

		expect(await response.text()).not.toContain('do-not-echo');
	});

	it('rejects a POST with no body', async () => {
		const response = await fetch(`${api.url}/auth/login`, { method: 'POST' });

		expect(response.status).toBe(400);
		expect(apiErrorSchema.parse(await response.json()).code).toBe('invalid_request');
	});

	it('rejects JSON that cannot be parsed', async () => {
		const response = await postRaw('/auth/login', 'application/json', '{"username":');

		expect(response.status).toBe(400);
		expect(apiErrorSchema.parse(await response.json()).code).toBe('invalid_request');
		await expectStillUp();
	});

	it('rejects a body that is too large, with its own status', async () => {
		const response = await postRaw('/auth/login', 'application/json', JSON.stringify({ username: 'x'.repeat(200_000) }));

		expect(response.status).toBe(413);
		expect(apiErrorSchema.parse(await response.json()).code).toBe('invalid_request');
	});

	it('rejects a URL that cannot be decoded', async () => {
		const response = await owner.get('/movie/%E0%A4%A');

		expect(response.status).toBe(400);
		expect(apiErrorSchema.parse(await response.json()).code).toBe('invalid_request');
	});

	it('answers an unknown route with the error shape', async () => {
		const response = await owner.get('/nothing/here');

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ code: 'not_found', message: 'Route not found' });
	});

	it('answers the wrong method for a route with the error shape', async () => {
		const response = await api.post('/movies', {});

		expect(response.status).toBe(404);
		expect(apiErrorSchema.parse(await response.json()).code).toBe('not_found');
	});
});
