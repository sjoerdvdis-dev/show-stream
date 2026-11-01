import { rm } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, type TestApi, type TestClient } from './support/api';

describe('an unexpected failure', () => {
	let api: TestApi;
	let owner: TestClient;

	beforeAll(async () => {
		api = await startApi();
		owner = await api.createOwner();
		await rm(path.join(api.mediaFolder, 'movies'), { recursive: true });
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('returns a generic error, logs the cause, and leaves the API up', async () => {
		const response = await owner.post('/scan');

		expect(response.status).toBe(500);
		const body = await response.text();
		expect(JSON.parse(body)).toEqual({ code: 'internal_error', message: 'Something went wrong' });
		expect(body).not.toContain(api.mediaFolder);
		expect(api.output()).toContain('ENOENT');
		expect(api.output()).toContain('/scan');
		expect((await owner.get('/movies')).status).toBe(200);
	});
});
