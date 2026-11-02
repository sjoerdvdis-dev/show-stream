import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { MovieMetadata } from '@workspace/contract/api-types';
import {
	closeDatabase,
	findLatestScan,
	findMovie,
	migrateDatabase,
	openDatabase,
	queueScan,
	type Database,
	type Job,
} from '@workspace/db';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { maxScanErrors, scanLibrary } from '../src/scan';
import type { MovieLookup } from '../src/tmdb';

const metadataFor = (id: number, title: string) =>
	({ details: { id, title }, credits: { cast: [], crew: [] }, images: {} }) as unknown as MovieMetadata;

describe('scanLibrary', () => {
	let folder: string;
	let db: Database;
	let job: Job;
	const running = new AbortController().signal;

	const addFolders = (...names: string[]) =>
		Promise.all(names.map((name) => mkdir(path.join(folder, 'movies', name), { recursive: true })));

	const scan = (lookup: MovieLookup | undefined, signal = running) => scanLibrary(db, folder, lookup, job, signal);

	const result = () => findLatestScan(db)?.payload.scanResult;

	beforeEach(async () => {
		folder = await mkdtemp(path.join(tmpdir(), 'show-stream-scan-test-'));
		await mkdir(path.join(folder, 'movies'));
		db = openDatabase(path.join(folder, 'app.db'));
		migrateDatabase(db);
		job = queueScan(db, new Date())!;
	});

	afterEach(async () => {
		closeDatabase(db);
		await rm(folder, { recursive: true, force: true });
	});

	it('keeps a title found before a later lookup was interrupted', async () => {
		await addFolders('First (2020)', 'Second (2021)');
		const stopping = new AbortController();

		const scanning = scan(async ({ name }) => {
			if (name === 'Second') {
				stopping.abort(new Error('The worker is shutting down.'));
				throw new Error('The request was aborted.');
			}
			return metadataFor(1, name);
		}, stopping.signal);

		await expect(scanning).rejects.toThrow('shutting down');
		expect(findMovie(db, 1)?.title).toBe('First');
		expect(result()).toBeUndefined();
	});

	it('stops between folders when it is shut down', async () => {
		await addFolders('First (2020)', 'Second (2021)');
		const stopping = new AbortController();
		const asked: string[] = [];

		const scanning = scan(async ({ name }) => {
			asked.push(name);
			stopping.abort(new Error('The worker is shutting down.'));
			return metadataFor(1, name);
		}, stopping.signal);

		await expect(scanning).rejects.toThrow('shutting down');
		expect(asked).toHaveLength(1);
	});

	it('counts a title that cannot be saved as failed, and carries on', async () => {
		await addFolders('First (2020)', 'Second (2021)');

		await scan(async ({ name }) => metadataFor(name === 'First' ? 1 : 2, name === 'First' ? (undefined as never) : name));

		expect(result()?.counts).toEqual({ found: 2, added: 1, updated: 0, unmatched: 0, failed: 1 });
		expect(result()?.errors).toEqual([expect.stringMatching(/^First \(2020\): /)]);
	});

	it('reads the message of an error that TMDB sent as JSON', async () => {
		await addFolders('First (2020)');

		const scanning = scan(() => Promise.reject({ status_code: 7, status_message: 'Invalid API key.' }));

		await expect(scanning).rejects.toThrow('First (2020): Invalid API key.');
	});

	it(`keeps ${maxScanErrors} errors in its result`, async () => {
		await addFolders(...Array.from({ length: maxScanErrors + 5 }, (_, index) => `Film (${2000 + index})`));

		await expect(scan(async () => undefined)).rejects.toThrow('No folder could be identified, out of 25 found.');

		expect(result()?.counts.unmatched).toBe(maxScanErrors + 5);
		expect(result()?.errors).toHaveLength(maxScanErrors);
	});

	it('fails with no token, before it reads anything', async () => {
		await expect(scan(undefined)).rejects.toThrow('No TMDB token is set');
	});

	it('finishes with no failure on an empty library', async () => {
		await scan(async () => undefined);

		expect(result()?.counts.found).toBe(0);
	});
});
