import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, type TestApi, type TestClient } from './support/api';
import { seedMovie } from './support/seed';

describe('library', () => {
	let api: TestApi;
	let owner: TestClient;

	beforeAll(async () => {
		api = await startApi();
		owner = await api.createOwner();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('starts empty', async () => {
		const movies = await owner.get('/movies');
		const shows = await owner.get('/shows');

		expect(movies.status).toBe(200);
		expect(await movies.json()).toEqual({ movies: [] });
		expect(shows.status).toBe(200);
		expect(await shows.json()).toEqual({ shows: [] });
	});

	describe('with a movie', () => {
		beforeAll(async () => {
			await seedMovie(api, 1001, 'First Movie');
		});

		it('lists the movie as not ready to play', async () => {
			const response = await owner.get('/movies');

			expect(response.status).toBe(200);
			const { movies } = await response.json();
			expect(movies).toHaveLength(1);
			expect(movies[0]).toMatchObject({
				details: { id: 1001, title: 'First Movie' },
				transcodeStatus: 'not ready',
			});
		});

		it('returns one movie by id', async () => {
			const response = await owner.get('/movie/1001');

			expect(response.status).toBe(200);
			expect(await response.json()).toMatchObject({
				metadata: { details: { title: 'First Movie' }, transcodeStatus: 'not ready' },
			});
		});

		it('answers 404 for an unknown id', async () => {
			const response = await owner.get('/movie/9999');

			expect(response.status).toBe(404);
			expect(await response.json()).toEqual({ code: 'not_found', message: 'Movie not found' });
		});
	});
});
