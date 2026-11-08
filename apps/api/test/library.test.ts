import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, type TestApi, type TestClient } from './support/api';
import { seedMovie, setTranscodeJob } from './support/seed';

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
		const response = await owner.get('/library/movies');

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ items: [], total: 0 });
	});

	it.each(['/movies', '/shows', '/movie/1001'])('no longer serves %s, which only the Next client used', async (path) => {
		const response = await owner.get(path);

		expect(response.status).toBe(404);
		expect(await response.json()).toMatchObject({ code: 'not_found' });
	});

	describe("a movie's page", () => {
		beforeAll(async () => {
			await seedMovie(api, 1001, 'First Movie', {
				runtime: 95,
				vote_average: 7.25,
				genres: [{ id: 18, name: 'Drama' }],
				tagline: 'It was the first.',
				overview: 'A movie that came first.',
			});
			await seedMovie(api, 1002, 'Failed Movie', { tagline: '', overview: '' });
			setTranscodeJob(api, { id: 1002, title: 'Failed Movie', folder: '' }, 'failed');
		});

		it('has its card, tagline and overview, and no art before a scan stores it', async () => {
			const response = await owner.get('/library/movies/1001');

			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({
				id: 1001,
				title: 'First Movie',
				year: 2024,
				releaseDate: '2024-01-01',
				runtime: 95,
				rating: 7.25,
				genres: ['Drama'],
				status: 'not ready',
				hasPoster: false,
				hasBackdrop: false,
				tagline: 'It was the first.',
				overview: 'A movie that came first.',
			});
		});

		it('gives a failed title its reason, and null for text TMDB left empty', async () => {
			const response = await owner.get('/library/movies/1002');

			expect(await response.json()).toMatchObject({
				status: 'failed',
				failureReason: 'A seeded failure',
				tagline: null,
				overview: null,
			});
		});

		it('answers 404 for an unknown id', async () => {
			const response = await owner.get('/library/movies/9999');

			expect(response.status).toBe(404);
			expect(await response.json()).toEqual({ code: 'not_found', message: 'Movie not found' });
		});

		it('still serves the facets at their own path', async () => {
			expect((await owner.get('/library/movies/facets')).status).toBe(200);
		});
	});
});
