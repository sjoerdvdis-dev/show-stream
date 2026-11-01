import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeEach, beforeAll, describe, expect, it } from 'vitest';
import { startApi, type TestApi } from './support/api';

// TMDB is unreachable in these tests, so no scan can identify a movie.
describe('scan', () => {
	let api: TestApi;
	let moviesFolder: string;

	beforeAll(async () => {
		api = await startApi();
		moviesFolder = path.join(api.mediaFolder, 'movies');
	});

	beforeEach(async () => {
		await rm(moviesFolder, { recursive: true, force: true });
		await mkdir(moviesFolder);
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('succeeds on an empty library', async () => {
		const response = await api.get('/scan');

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Successfully scanned media folder');
	});

	it('ignores folders that are not named "Title (Year)"', async () => {
		await mkdir(path.join(moviesFolder, 'not a movie folder'));

		const response = await api.get('/scan');

		expect(response.status).toBe(200);
		expect(await (await api.get('/movies')).json()).toEqual({ movies: [] });
	});

	it('adds no movie that it cannot identify', async () => {
		await mkdir(path.join(moviesFolder, 'Unknown Film (2024)'));

		await api.get('/scan');

		expect(await (await api.get('/movies')).json()).toEqual({ movies: [] });
	});

	it('answers 500 when the movies folder is missing', async () => {
		await rm(moviesFolder, { recursive: true });

		const response = await api.get('/scan');

		expect(response.status).toBe(500);
		expect((await api.get('/movies')).status).toBe(200);
	});
});
