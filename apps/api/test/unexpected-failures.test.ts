import { rm } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, type TestApi, type TestClient } from './support/api';
import { seedMovie, type SeededMovie } from './support/seed';

describe('an unexpected failure', () => {
	let api: TestApi;
	let owner: TestClient;
	let movie: SeededMovie;

	// A title whose folder has gone is not a case the API expects.
	beforeAll(async () => {
		api = await startApi();
		owner = await api.createOwner();
		movie = await seedMovie(api, 4101);
		await rm(path.join(api.mediaFolder, movie.folder), { recursive: true });
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('returns a generic error, logs the cause, and leaves the API up', async () => {
		const response = await owner.get(`/transcode/request/${movie.id}`);

		expect(response.status).toBe(500);
		const body = await response.text();
		expect(JSON.parse(body)).toEqual({ code: 'internal_error', message: 'Something went wrong' });
		expect(body).not.toContain(api.mediaFolder);
		expect(api.output()).toContain('ENOENT');
		expect(api.output()).toContain('/transcode/request');
		expect((await owner.get('/library/movies')).status).toBe(200);
	});
});
