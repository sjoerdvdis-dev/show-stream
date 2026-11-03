import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startApi, type TestApi, type TestClient } from './support/api';
import { clearLibrary, seedMovie } from './support/seed';

type Page = { items: { id: number; title: string }[]; total: number; page: number; pageSize: number };

describe('the paged library list', () => {
	let api: TestApi;
	let owner: TestClient;

	const list = async (query = ''): Promise<Page> => {
		const response = await owner.get(`/library/movies${query}`);
		expect(response.status).toBe(200);
		return response.json();
	};

	const titles = async (query = '') => (await list(query)).items.map(({ title }) => title);

	beforeAll(async () => {
		api = await startApi();
		owner = await api.createOwner();
	});

	beforeEach(() => {
		clearLibrary(api);
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('is empty for an empty library', async () => {
		expect(await list()).toEqual({ items: [], total: 0, page: 1, pageSize: 24 });
	});

	it('lists titles by name by default', async () => {
		await seedMovie(api, 1, 'Brazil');
		await seedMovie(api, 2, 'alien');
		await seedMovie(api, 3, 'Casablanca');

		expect(await titles()).toEqual(['alien', 'Brazil', 'Casablanca']);
	});

	describe('sorting', () => {
		// Popularity and vote count run in opposite directions, so a sort on the wrong one shows (finding 30).
		beforeEach(async () => {
			await seedMovie(api, 1, 'Alpha', {
				release_date: '2001-05-01',
				runtime: 100,
				vote_average: 7,
				popularity: 50,
				vote_count: 500,
			});
			await seedMovie(api, 2, 'Bravo', {
				release_date: '1999-12-31',
				runtime: 90,
				vote_average: 8.5,
				popularity: 10,
				vote_count: 1000,
			});
			await seedMovie(api, 3, 'Charlie', {
				release_date: '2010-01-15',
				runtime: 150,
				vote_average: 6,
				popularity: 99,
				vote_count: 1,
			});
			// TMDB knows nothing about this one, so it sorts last either way.
			await seedMovie(api, 4, 'Delta', { release_date: '' });
		});

		it.each([
			['title', 'asc', ['Alpha', 'Bravo', 'Charlie', 'Delta']],
			['title', 'desc', ['Delta', 'Charlie', 'Bravo', 'Alpha']],
			['year', 'asc', ['Bravo', 'Alpha', 'Charlie', 'Delta']],
			['year', 'desc', ['Charlie', 'Alpha', 'Bravo', 'Delta']],
			['releaseDate', 'asc', ['Bravo', 'Alpha', 'Charlie', 'Delta']],
			['releaseDate', 'desc', ['Charlie', 'Alpha', 'Bravo', 'Delta']],
			['runtime', 'asc', ['Bravo', 'Alpha', 'Charlie', 'Delta']],
			['runtime', 'desc', ['Charlie', 'Alpha', 'Bravo', 'Delta']],
			['rating', 'asc', ['Charlie', 'Alpha', 'Bravo', 'Delta']],
			['rating', 'desc', ['Bravo', 'Alpha', 'Charlie', 'Delta']],
			['popularity', 'asc', ['Bravo', 'Alpha', 'Charlie', 'Delta']],
			['popularity', 'desc', ['Charlie', 'Alpha', 'Bravo', 'Delta']],
		])('sorts by %s, %s', async (sort, order, expected) => {
			expect(await titles(`?sort=${sort}&order=${order}`)).toEqual(expected);
		});

		it('returns a slim item for each title, without the TMDB payload', async () => {
			const { items } = await list('?sort=title');

			expect(items[0]).toEqual({
				id: 1,
				title: 'Alpha',
				year: 2001,
				releaseDate: '2001-05-01',
				runtime: 100,
				rating: 7,
				genres: [],
				status: 'not ready',
				hasPoster: false,
				hasBackdrop: false,
			});
			expect(items[3]).toMatchObject({ title: 'Delta', year: null, releaseDate: null, runtime: null, rating: null });
		});
	});

	describe('paging', () => {
		const count = 30;

		beforeEach(async () => {
			for (let id = 1; id <= count; id += 1) {
				await seedMovie(api, 100 + id, 'Same Title', { vote_average: 5 });
			}
		});

		it('breaks ties the same way on every page, so that no title is skipped or repeated', async () => {
			const seen: number[] = [];
			for (let page = 1; page <= 5; page += 1) {
				const result = await list(`?sort=rating&order=desc&pageSize=7&page=${page}`);
				expect(result).toMatchObject({ total: count, page, pageSize: 7 });
				seen.push(...result.items.map(({ id }) => id));
			}

			expect(seen).toHaveLength(count);
			expect(new Set(seen).size).toBe(count);
		});

		it('is empty past the last page, and still counts every match', async () => {
			expect(await list('?page=9&pageSize=10')).toEqual({ items: [], total: count, page: 9, pageSize: 10 });
		});

		it('gives 24 titles by default, and up to 100', async () => {
			expect((await list()).items).toHaveLength(24);
			expect((await list('?pageSize=100')).items).toHaveLength(count);
		});
	});

	describe('a query it cannot use', () => {
		it.each([
			['a page size over the cap', '?pageSize=101', 'pageSize', 'Page size must be at most 100'],
			['a page of 0', '?page=0', 'page', 'Pages start at 1'],
			['a page that is not a number', '?page=two', 'page', 'Page must be a number'],
			['an unknown sort', '?sort=votes', 'sort', 'Sort by one of title, year, releaseDate, runtime, rating, popularity'],
			['an unknown order', '?order=up', 'order', 'Order must be asc or desc'],
			['a date that is not ISO', '?releaseDateFrom=01/02/2024', 'releaseDateFrom', 'Must be a date as YYYY-MM-DD'],
			['a date that does not exist', '?releaseDateTo=2024-02-30', 'releaseDateTo', 'Must be a real date'],
			['a range whose ends are swapped', '?yearMin=2010&yearMax=2000', 'yearMin', 'yearMin cannot be after yearMax'],
			['a rating over 10', '?ratingMax=11', 'ratingMax', 'Rating is from 0 to 10'],
			['an unknown status', '?status=done', 'status.0', expect.any(String)],
			['a key given twice that takes one value', '?page=1&page=2', 'page', 'Page must be a number'],
			['an unknown filter', '?colour=red', '', expect.stringContaining('colour')],
		])('answers 400 to %s', async (_case, query, path, message) => {
			const response = await owner.get(`/library/movies${query}`);

			expect(response.status).toBe(400);
			expect(await response.json()).toEqual({
				code: 'invalid_request',
				message: 'The request is invalid',
				details: [{ path, message }],
			});
		});

		it('ignores a filter with an empty value', async () => {
			expect((await owner.get('/library/movies?yearMin=&q=&genre=')).status).toBe(200);
		});
	});
});
