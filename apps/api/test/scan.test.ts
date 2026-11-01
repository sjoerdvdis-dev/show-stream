import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startApi, type TestApi, type TestClient } from './support/api';

// TMDB is unreachable in these tests, so no scan can identify a movie.
describe('scan', () => {
	let api: TestApi;
	let owner: TestClient;
	let moviesFolder: string;

	beforeAll(async () => {
		api = await startApi();
		owner = await api.createOwner();
		moviesFolder = path.join(api.mediaFolder, 'movies');
	});

	beforeEach(async () => {
		await rm(moviesFolder, { recursive: true, force: true });
		await mkdir(moviesFolder);
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('no longer answers GET, because a scan changes the library', async () => {
		expect((await owner.get('/scan')).status).toBe(404);
	});

	it('succeeds on an empty library', async () => {
		const response = await owner.post('/scan');

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Successfully scanned media folder');
	});

	it('ignores folders that are not named "Title (Year)"', async () => {
		await mkdir(path.join(moviesFolder, 'not a movie folder'));

		const response = await owner.post('/scan');

		expect(response.status).toBe(200);
		expect(await (await owner.get('/movies')).json()).toEqual({ movies: [] });
	});

	it('adds no movie that it cannot identify', async () => {
		await mkdir(path.join(moviesFolder, 'Unknown Film (2024)'));

		await owner.post('/scan');

		expect(await (await owner.get('/movies')).json()).toEqual({ movies: [] });
	});

	it('answers 500 when the movies folder is missing', async () => {
		await rm(moviesFolder, { recursive: true });

		const response = await owner.post('/scan');

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ code: 'internal_error', message: 'Something went wrong' });
		expect((await owner.get('/movies')).status).toBe(200);
	});
});
