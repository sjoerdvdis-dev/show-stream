import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ownerCredentials, startApi, type TestApi } from './support/api';
import { createDatabaseWithDefaultAccount, createDatabaseWithOldJobs, createDatabaseWithOldMovies } from './support/seed';

describe('upgrading a database that has the default account', () => {
	let api: TestApi;

	beforeAll(async () => {
		api = await startApi({ prepareDatabase: createDatabaseWithDefaultAccount });
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('removes the account, so that it cannot log in', async () => {
		const response = await api.post('/auth/login', { username: 'admin', password: 'admin' });

		expect(response.status).toBe(401);
	});

	it('keeps other accounts', async () => {
		expect((await api.post('/auth/login', { username: 'sam', password: 'correct horse' })).status).toBe(200);
	});

	it('refuses a username that an older account holds, and stays open for setup', async () => {
		const response = await api.post('/auth/setup', { username: 'sam', password: 'correct horse' });

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ code: 'conflict', message: 'That username is taken' });
		expect(await (await api.get('/auth/setup')).json()).toEqual({ needed: true });
	});

	it('needs setup, which can then take the old name', async () => {
		expect(await (await api.get('/auth/setup')).json()).toEqual({ needed: true });

		const response = await api.post('/auth/setup', { ...ownerCredentials, username: 'admin' });

		expect(response.status).toBe(201);
		expect(await (await api.get('/auth/setup')).json()).toEqual({ needed: false });
	});
});

describe('upgrading a database from before the worker', () => {
	let api: TestApi;

	beforeAll(async () => {
		api = await startApi({
			prepareDatabase: (databasePath) =>
				createDatabaseWithOldJobs(databasePath, [
					{ title: 'Old Ready', status: 'ready' },
					{ title: 'Old In Progress', status: 'in progress' },
				]),
		});
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('keeps finished transcodes, and clears those no process is running any more', async () => {
		const owner = await api.createOwner();

		const { movies } = await (await owner.get('/movies')).json();

		expect(movies.map(({ details, transcodeStatus }: { details: { title: string }; transcodeStatus: string }) => [details.title, transcodeStatus])).toEqual([
			['Old Ready', 'ready'],
			['Old In Progress', 'not ready'],
		]);
	});
});

describe('upgrading a database from before library search', () => {
	let api: TestApi;

	beforeAll(async () => {
		api = await startApi({
			prepareDatabase: (databasePath) =>
				createDatabaseWithOldMovies(databasePath, [
					{ id: 8001, title: 'The Dark Knight', details: { genres: [{ id: 28, name: 'Action' }, { id: 80, name: 'Crime' }] } },
					{ id: 8002, title: 'Amélie', details: { original_title: "Le Fabuleux Destin d'Amélie Poulain", genres: [{ id: 35, name: 'Comedy' }] } },
					{ id: 8003, title: 'No Genres' },
				]),
		});
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('finds the titles that were already there, by title and by original title', async () => {
		const owner = await api.createOwner();
		const titlesOf = async (query: string) =>
			(await (await owner.get(`/library/movies${query}`)).json()).items.map(({ title }: { title: string }) => title);

		expect(await titlesOf('?q=dark%20kni')).toEqual(['The Dark Knight']);
		expect(await titlesOf('?q=fabuleux')).toEqual(['Amélie']);
		expect(await titlesOf('?genre=Crime')).toEqual(['The Dark Knight']);
		expect((await (await owner.get('/library/movies/facets')).json()).genres).toEqual([
			{ name: 'Action', count: 1 },
			{ name: 'Comedy', count: 1 },
			{ name: 'Crime', count: 1 },
		]);
	});
});
