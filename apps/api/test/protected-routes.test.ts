import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { endpoints, type Endpoint } from '@workspace/contract/endpoints';
import { apiErrorSchema } from '@workspace/contract/errors';
import { startApi, type TestApi } from './support/api';

const allEndpoints: [string, Endpoint][] = Object.entries(endpoints);

const isPublic = ([, endpoint]: [string, Endpoint]) => endpoint.access === 'public';

const route = (endpoint: Endpoint) => endpoint.path.replace(':id', '1').replace(':file', 'playlist.m3u8');

// Driven by the contract, so that a new endpoint is covered without touching this file.
describe('every endpoint that is not public', () => {
	let api: TestApi;

	const send = ({ method, ...endpoint }: Endpoint, headers?: Record<string, string>) =>
		method === 'GET' ? api.get(route(endpoint as Endpoint), headers) : api.post(route(endpoint as Endpoint), {}, headers);

	beforeAll(async () => {
		api = await startApi();
		await api.createOwner();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('exists', () => {
		expect(allEndpoints.filter((entry) => !isPublic(entry)).length).toBeGreaterThan(0);
	});

	describe.each(allEndpoints.filter((entry) => !isPublic(entry)))('%s', (_name, endpoint) => {
		it('answers 401 with no session', async () => {
			const response = await send(endpoint);

			expect(response.status).toBe(401);
			expect(apiErrorSchema.parse(await response.json()).code).toBe('unauthorized');
		});

		it('answers 401 with an invalid session', async () => {
			expect((await send(endpoint, { cookie: 'session=invalid' })).status).toBe(401);
		});
	});

	it('checks the session before the input, so that a request with no session learns nothing', async () => {
		expect((await api.get('/movie/not-a-number')).status).toBe(401);
		expect((await api.get('/streams/1/clip.mp4')).status).toBe(401);
	});

	it('leaves only setup and login public', () => {
		const open = allEndpoints.filter(isPublic).map(([, { method, path }]) => `${method} ${path}`);

		expect(open.sort()).toEqual(['GET /auth/setup', 'POST /auth/login', 'POST /auth/setup']);
	});
});
