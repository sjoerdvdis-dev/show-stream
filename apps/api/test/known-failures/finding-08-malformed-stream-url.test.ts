import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, type TestApi } from '../support/api';

describe('audit finding 8', () => {
	let api: TestApi;

	beforeAll(async () => {
		api = await startApi();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it.fails('finding 8, fixed by item 5: a malformed stream URL is rejected and the API stays up', async () => {
		const response = await api.get('/streams/abc/x.ts');

		expect(response.status).toBe(400);
		expect((await api.get('/movies')).status).toBe(200);
	});
});
