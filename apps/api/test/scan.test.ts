import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import type { Scan } from '@workspace/contract/api-types';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startApi, type ApiOptions, type TestApi, type TestClient } from './support/api';
import { addUser, clearLibrary } from './support/seed';

const noCounts = { found: 0, added: 0, updated: 0, unmatched: 0, failed: 0 };

const latestScan = async (client: TestClient): Promise<Scan | null> => (await (await client.get('/scan')).json()).scan;

const finishedScan = (api: TestApi, client: TestClient) =>
	api.waitFor(async () => {
		const scan = await latestScan(client);
		expect(['done', 'failed']).toContain(scan?.status);
		return scan!;
	});

const scanLibrary = async (api: TestApi, client: TestClient) => {
	expect((await client.post('/scan')).status).toBe(202);
	return finishedScan(api, client);
};

const addFolders = (api: TestApi, ...folders: string[]) =>
	Promise.all(folders.map((folder) => mkdir(path.join(api.mediaFolder, 'movies', folder))));

const startOwner = async (options: ApiOptions) => {
	const api = await startApi(options);
	return { api, owner: await api.createOwner() };
};

describe('a scan with a fake TMDB', () => {
	let api: TestApi;
	let owner: TestClient;
	let moviesFolder: string;

	beforeAll(async () => {
		({ api, owner } = await startOwner({ fakeTmdb: true }));
		moviesFolder = path.join(api.mediaFolder, 'movies');
	});

	beforeEach(async () => {
		await rm(moviesFolder, { recursive: true, force: true });
		await mkdir(moviesFolder);
		clearLibrary(api);
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('has no result before the first scan', async () => {
		const response = await owner.get('/scan');

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ scan: null });
	});

	it('answers 202 at once, and then has a result', async () => {
		const response = await owner.post('/scan');

		expect(response.status).toBe(202);
		const { scan } = await response.json();
		expect(scan).toMatchObject({ status: 'queued', counts: noCounts, errors: [] });
		expect(Number.isNaN(Date.parse(scan.time))).toBe(false);

		expect(await finishedScan(api, owner)).toEqual({
			status: 'done',
			time: expect.any(String),
			counts: noCounts,
			errors: [],
		});
	});

	it('ignores folders that are not named "Title (Year)"', async () => {
		await addFolders(api, 'not a movie folder');

		expect(await scanLibrary(api, owner)).toMatchObject({ status: 'done', counts: noCounts });
		expect(await (await owner.get('/movies')).json()).toEqual({ movies: [] });
	});

	it('counts what it added, what it updated, and lists what went wrong', async () => {
		await addFolders(api, 'Scanned Movie 2 (2024)', 'Scanned Movie 3 (2024)', 'No Match (2024)', 'Broken Lookup (2024)');

		const first = await scanLibrary(api, owner);

		// Partial success is `done`.
		expect(first.status).toBe('done');
		expect(first.counts).toEqual({ found: 4, added: 2, updated: 0, unmatched: 1, failed: 1 });
		expect([...first.errors].sort()).toEqual([
			'Broken Lookup (2024): Invalid API key: You must be granted a valid key.',
			'No Match (2024): TMDB has no match',
		]);
		const { movies } = await (await owner.get('/movies')).json();
		expect(movies.map(({ details }: { details: { title: string } }) => details.title).sort()).toEqual([
			'Scanned Movie 2',
			'Scanned Movie 3',
		]);

		expect((await scanLibrary(api, owner)).counts).toEqual({ found: 4, added: 0, updated: 2, unmatched: 1, failed: 1 });
	});

	it('fails when it found folders and identified none', async () => {
		await addFolders(api, 'No Match (2024)', 'Broken Lookup (2024)');

		const scan = await scanLibrary(api, owner);

		expect(scan.status).toBe('failed');
		expect(scan.error).toContain('None of the 2 folders could be identified');
		expect(scan.counts).toEqual({ found: 2, added: 0, updated: 0, unmatched: 1, failed: 1 });
		expect(scan.errors).toHaveLength(2);
	});

	it('caps its list of errors, and keeps the true counts', async () => {
		const unknown = Array.from({ length: 30 }, () => 'No Match').map((name, index) => `${name} (${2000 + index})`);
		await addFolders(api, 'Scanned Movie 4 (2024)', ...unknown);

		const scan = await scanLibrary(api, owner);

		expect(scan.status).toBe('done');
		expect(scan.counts).toEqual({ found: 31, added: 1, updated: 0, unmatched: 30, failed: 0 });
		expect(scan.errors).toHaveLength(20);
	});

	it('fails with a reason, and no path, when the movies folder is missing', async () => {
		await rm(moviesFolder, { recursive: true });

		const scan = await scanLibrary(api, owner);

		expect(scan).toMatchObject({ status: 'failed', error: 'Could not read the movies folder (ENOENT).' });
		expect((await owner.get('/movies')).status).toBe(200);
	});

	it('answers 403 to an admin route for a user who is not one', async () => {
		await addUser(api, 'viewer', 'correct horse');
		const viewer = await api.logIn('viewer', 'correct horse');

		expect((await viewer.post('/scan')).status).toBe(403);
		expect((await viewer.get('/scan')).status).toBe(403);
	});

	describe('while a scan is active', () => {
		afterEach(async () => {
			await api.stopWorkers();
			await api.startWorker();
			await finishedScan(api, owner);
		});

		it('answers 409, and queues no second scan', async () => {
			await api.stopWorkers();
			const { scan } = await (await owner.post('/scan')).json();

			const second = await owner.post('/scan');

			expect(second.status).toBe(409);
			expect(await second.json()).toMatchObject({ code: 'conflict' });
			expect(await latestScan(owner)).toEqual(scan);
		});
	});

	it('runs again once the last scan has finished', async () => {
		await scanLibrary(api, owner);

		expect((await owner.post('/scan')).status).toBe(202);
		await finishedScan(api, owner);
	});
});

describe('a scan with no TMDB token', () => {
	let api: TestApi;
	let owner: TestClient;

	beforeAll(async () => {
		({ api, owner } = await startOwner({ tmdbToken: '' }));
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('fails and says so, even on an empty library', async () => {
		const scan = await scanLibrary(api, owner);

		expect(scan.status).toBe('failed');
		expect(scan.error).toContain('TMDB_API_READ_ACCESS_TOKEN');
		expect(scan.counts).toEqual(noCounts);
	});
});

// TMDB is unreachable in these tests, so every lookup fails.
describe('audit finding 14', () => {
	let api: TestApi;
	let owner: TestClient;

	beforeAll(async () => {
		({ api, owner } = await startOwner({}));
		await addFolders(api, 'Unknown Film (2024)');
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('a scan whose lookups all failed does not report success', async () => {
		const scan = await scanLibrary(api, owner);

		expect(scan.status).toBe('failed');
		expect(scan.counts).toEqual({ found: 1, added: 0, updated: 0, unmatched: 0, failed: 1 });
		expect(scan.errors).toEqual([expect.stringMatching(/^Unknown Film \(2024\): /)]);
		expect(await (await owner.get('/movies')).json()).toEqual({ movies: [] });
	});
});
