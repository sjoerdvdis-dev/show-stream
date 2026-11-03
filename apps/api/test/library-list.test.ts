import type { LibraryPage } from '@workspace/contract/library';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startApi, type TestApi, type TestClient } from './support/api';
import { clearLibrary, seedMovie, setTranscodeJob } from './support/seed';

describe('the paged library list', () => {
	let api: TestApi;
	let owner: TestClient;

	const list = async (query = ''): Promise<LibraryPage> => {
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

	/**
	 * Four titles whose values all differ. Popularity and vote count run in opposite directions,
	 * so that a sort on the wrong one shows (finding 30). TMDB knows nothing about Delta.
	 */
	const seedFour = async () => {
		const alpha = await seedMovie(api, 1, 'Alpha', {
			release_date: '2001-05-01',
			runtime: 100,
			vote_average: 7,
			popularity: 50,
			vote_count: 500,
			genres: [
				{ id: 18, name: 'Drama' },
				{ id: 28, name: 'Action' },
			],
		});
		const bravo = await seedMovie(api, 2, 'Bravo', {
			release_date: '1999-12-31',
			runtime: 90,
			vote_average: 8.5,
			popularity: 10,
			vote_count: 1000,
			genres: [{ id: 35, name: 'Comedy' }],
		});
		const charlie = await seedMovie(api, 3, 'Charlie', {
			release_date: '2010-01-15',
			runtime: 150,
			vote_average: 6,
			popularity: 99,
			vote_count: 1,
			genres: [{ id: 18, name: 'Drama' }],
		});
		await seedMovie(api, 4, 'Delta', { release_date: '' });
		setTranscodeJob(api, alpha, 'failed');
		setTranscodeJob(api, bravo, 'running');
		setTranscodeJob(api, charlie, 'done');
	};

	describe('sorting', () => {
		beforeEach(seedFour);

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
				genres: ['Action', 'Drama'],
				status: 'failed',
				hasPoster: false,
				hasBackdrop: false,
			});
			expect(items[3]).toMatchObject({ title: 'Delta', year: null, releaseDate: null, runtime: null, rating: null });
		});
	});

	describe('filtering', () => {
		beforeEach(seedFour);

		it.each([
			['a lowest year, which it includes', '?yearMin=2001', ['Alpha', 'Charlie']],
			['a highest year, which it includes', '?yearMax=2001', ['Alpha', 'Bravo']],
			[
				'a release date range, which includes both ends',
				'?releaseDateFrom=2001-05-01&releaseDateTo=2010-01-15',
				['Alpha', 'Charlie'],
			],
			['a release date one day after a title', '?releaseDateFrom=2001-05-02', ['Charlie']],
			['a release date one day before a title', '?releaseDateTo=2001-04-30', ['Bravo']],
			['a runtime range', '?runtimeMin=90&runtimeMax=100', ['Alpha', 'Bravo']],
			['a lowest rating', '?ratingMin=7', ['Alpha', 'Bravo']],
			['a highest rating just under a title', '?ratingMax=6.99', ['Charlie']],
			['one genre', '?genre=Drama', ['Alpha', 'Charlie']],
			['any of several genres', '?genre=Comedy&genre=Action', ['Alpha', 'Bravo']],
			['a genre nobody has', '?genre=Western', []],
			['the failed status', '?status=failed', ['Alpha']],
			['the not ready status, for a title with no job', '?status=not%20ready', ['Delta']],
			['any of several statuses', '?status=in%20progress&status=ready', ['Bravo', 'Charlie']],
			['filters together', '?genre=Drama&yearMin=2005', ['Charlie']],
		])('filters by %s', async (_case, query, expected) => {
			const result = await list(query);

			expect(result.items.map(({ title }) => title)).toEqual(expected);
			expect(result.total).toBe(expected.length);
		});

		it('gives each item its genres and its playback status', async () => {
			const { items } = await list();

			expect(items.map(({ genres, status }) => ({ genres, status }))).toEqual([
				{ genres: ['Action', 'Drama'], status: 'failed' },
				{ genres: ['Comedy'], status: 'in progress' },
				{ genres: ['Drama'], status: 'ready' },
				{ genres: [], status: 'not ready' },
			]);
		});
	});

	describe('search', () => {
		beforeEach(async () => {
			await seedMovie(api, 1, 'The Dark Knight');
			await seedMovie(api, 2, 'Knight and Day');
			await seedMovie(api, 3, 'Amélie', { original_title: "Le Fabuleux Destin d'Amélie Poulain" });
			await seedMovie(api, 4, 'Alien');
		});

		it.each([
			['whole words', 'dark knight', ['The Dark Knight']],
			['words in any order', 'knight dark', ['The Dark Knight']],
			['the start of each word', 'dar kni', ['The Dark Knight']],
			['one word in several titles', 'knight', ['Knight and Day', 'The Dark Knight']],
			['any case', 'ALIEN', ['Alien']],
			['no accents', 'amelie', ['Amélie']],
			['the original title', 'fabuleux destin', ['Amélie']],
			['a word that no title has', 'zebra', []],
		])('matches %s', async (_case, q, expected) => {
			expect(await titles(`?q=${encodeURIComponent(q)}`)).toEqual(expected);
		});

		it.each([
			['a quote', 'dark"', ['The Dark Knight']],
			['a quoted phrase', '"dark knight"', ['The Dark Knight']],
			['OR, which stays a word', 'dark OR alien', []],
			['NOT, which stays a word', 'knight NOT dark', []],
			['a minus', 'knight -dark', ['The Dark Knight']],
			['a column filter', 'title:alien', []],
			['NEAR and brackets', 'NEAR(dark knight)', []],
			['a star on its own', '*', []],
			['only punctuation', '"" ( ) ^', []],
			['a caret', '^alien', ['Alien']],
		])('reads %s as text, not as search syntax', async (_case, q, expected) => {
			expect(await titles(`?q=${encodeURIComponent(q)}`)).toEqual(expected);
		});

		it('follows a title that changes', async () => {
			await seedMovie(api, 4, 'Aliens');

			expect(await titles('?q=aliens')).toEqual(['Aliens']);
			expect(await titles('?q=zebra')).toEqual([]);
			await seedMovie(api, 4, 'Zebra');
			expect(await titles('?q=aliens')).toEqual([]);
			expect(await titles('?q=zebra')).toEqual(['Zebra']);
		});

		it('forgets a title that is removed', async () => {
			clearLibrary(api);

			expect(await titles('?q=dark')).toEqual([]);
		});

		it('combines with filters and sorting', async () => {
			expect(await titles('?q=knight&sort=title&order=desc')).toEqual(['The Dark Knight', 'Knight and Day']);
		});
	});

	describe('facets', () => {
		const facets = async () => {
			const response = await owner.get('/library/movies/facets');
			expect(response.status).toBe(200);
			return response.json();
		};

		it('are empty for an empty library, with no infinite ranges (finding 32)', async () => {
			expect(await facets()).toEqual({
				year: null,
				releaseDate: null,
				runtime: null,
				rating: null,
				genres: [],
				statuses: { 'not ready': 0, 'in progress': 0, ready: 0, failed: 0 },
			});
		});

		it('give the ranges, genres and statuses of the whole library', async () => {
			await seedFour();

			expect(await facets()).toEqual({
				year: { min: 1999, max: 2010 },
				releaseDate: { min: '1999-12-31', max: '2010-01-15' },
				runtime: { min: 90, max: 150 },
				rating: { min: 6, max: 8.5 },
				genres: [
					{ name: 'Action', count: 1 },
					{ name: 'Comedy', count: 1 },
					{ name: 'Drama', count: 2 },
				],
				statuses: { 'not ready': 1, 'in progress': 1, ready: 1, failed: 1 },
			});
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
			[
				'an unknown sort',
				'?sort=votes',
				'sort',
				'Sort by one of title, year, releaseDate, runtime, rating, popularity',
			],
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
