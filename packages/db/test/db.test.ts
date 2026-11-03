import { statSync } from 'node:fs';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { MovieMetadata } from '@workspace/contract/api-types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	addTranscodeRequester,
	backupDatabase,
	claimNextJob,
	closeDatabase,
	createOwner,
	createSession,
	createUser,
	deleteExpiredSessions,
	deleteSession,
	extendSession,
	failJob,
	findLatestScan,
	findMovie,
	findSession,
	findUserByUsername,
	finishJob,
	getSetting,
	hasOwner,
	isDatabaseMigrated,
	libraryFacets,
	listLibrary,
	listMovies,
	listShows,
	markTranscodeDone,
	migrateDatabase,
	openDatabase,
	queueDailyBackup,
	queueScan,
	queueTranscode,
	recordPlaylistRequest,
	recordScanResult,
	recoverJobs,
	requeueJob,
	retryTranscode,
	saveMedia,
	saveMovie,
	setSetting,
	takeFinishedTranscodes,
	type Database,
} from '../src/index';

const movieMetadata = (id: number, title: string) =>
	({
		details: { id, title, release_date: '2024-05-01', runtime: 90, vote_average: 7.5, vote_count: 10, popularity: 1.5 },
		credits: { cast: [], crew: [] },
		images: { posters: [], backdrops: [], logos: [] },
	}) as unknown as MovieMetadata;

const tableNames = (db: Database) =>
	db.$client
		.prepare<[], { name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)
		.all()
		.map(({ name }) => name);

const rowCount = (db: Database, table: string) =>
	db.$client.prepare<[], { count: number }>(`SELECT count(*) AS count FROM ${table}`).get()?.count;

/** A copy of the migrations as an older version shipped them. */
const migrationsWithoutTheLast = async () => {
	const folder = await mkdtemp(path.join(tmpdir(), 'show-stream-old-migrations-'));
	await cp(path.resolve(import.meta.dirname, '../migrations'), folder, { recursive: true });
	const journalPath = path.join(folder, 'meta', '_journal.json');
	const journal = JSON.parse(await readFile(journalPath, 'utf8'));
	journal.entries.pop();
	await writeFile(journalPath, JSON.stringify(journal));
	return folder;
};

describe('database', () => {
	let folder: string;
	let file: string;
	let db: Database;

	beforeEach(async () => {
		folder = await mkdtemp(path.join(tmpdir(), 'show-stream-db-test-'));
		file = path.join(folder, 'nested', 'app.db');
		db = openDatabase(file);
	});

	afterEach(async () => {
		closeDatabase(db);
		await rm(folder, { recursive: true, force: true, maxRetries: 5 });
	});

	describe('migrations', () => {
		it('builds every table from an empty file, in a folder that did not exist', () => {
			expect(tableNames(db)).toEqual([]);

			migrateDatabase(db);

			expect(tableNames(db)).toEqual(expect.arrayContaining(['jobs', 'media', 'sessions', 'settings', 'users']));
		});

		it('changes nothing when run again', () => {
			migrateDatabase(db);
			createUser(db, { username: 'sam', passwordHash: 'hash' });

			migrateDatabase(db);

			expect(findUserByUsername(db, 'sam')).toBeDefined();
		});

		it('reports whether every migration has been applied', async () => {
			expect(isDatabaseMigrated(db)).toBe(false);

			const older = await migrationsWithoutTheLast();
			migrateDatabase(db, older);
			await rm(older, { recursive: true, force: true });
			expect(isDatabaseMigrated(db)).toBe(false);

			migrateDatabase(db);
			expect(isDatabaseMigrated(db)).toBe(true);
		});

		it('throws when a migration fails', () => {
			db.$client.exec('CREATE TABLE users (id INTEGER)');

			expect(() => migrateDatabase(db)).toThrow();
		});
	});

	it('opens with WAL, a busy timeout and foreign keys on', () => {
		expect(db.$client.pragma('journal_mode', { simple: true })).toBe('wal');
		expect(db.$client.pragma('busy_timeout', { simple: true })).toBe(5000);
		expect(db.$client.pragma('foreign_keys', { simple: true })).toBe(1);
	});

	describe('once migrated', () => {
		beforeEach(() => {
			migrateDatabase(db);
		});

		it('keeps its data when closed and opened again', () => {
			saveMovie(db, { tmdbId: 1, path: 'movies/One (2024)', metadata: movieMetadata(1, 'One') });
			closeDatabase(db);

			db = openDatabase(file);

			expect(findMovie(db, 1)?.title).toBe('One');
		});

		// An insert that stops at its RETURNING row commits without running the WAL hook.
		it('checkpoints as it writes, so that the WAL stops growing', () => {
			const passwordHash = 'x'.repeat(2_000);
			const wal = `${file}-wal`;

			for (let index = 0; index < 3_000; index++) {
				createUser(db, { username: `user-${index}`, passwordHash });
			}
			saveMovie(db, { tmdbId: 1, path: 'movies/One', metadata: movieMetadata(1, 'One') });

			expect(statSync(wal).size).toBeLessThan(5_000_000);
			expect(statSync(file).size).toBeGreaterThan(1_000_000);
			// 3,000 writes take longer than the default 5 seconds on a slow CI runner.
		}, 30_000);

		describe('media', () => {
			it('lets a movie and a show share a TMDB ID', () => {
				saveMovie(db, { tmdbId: 7, path: 'movies/Seven (2024)', metadata: movieMetadata(7, 'Seven') });
				saveMedia(db, { type: 'show', tmdbId: 7, title: 'Seven', path: 'shows/Seven', metadata: {} });

				expect(rowCount(db, 'media')).toBe(2);
				expect(findMovie(db, 7)?.path).toBe('movies/Seven (2024)');
				expect(listShows(db).map(({ path }) => path)).toEqual(['shows/Seven']);
			});

			it('updates a title that is saved twice, and keeps its internal ID', () => {
				const first = saveMovie(db, { tmdbId: 7, path: 'movies/Old', metadata: movieMetadata(7, 'Old') });
				const second = saveMovie(db, { tmdbId: 7, path: 'movies/New', metadata: movieMetadata(7, 'New') });

				expect(second.id).toBe(first.id);
				expect(listMovies(db).map(({ title, path }) => ({ title, path }))).toEqual([{ title: 'New', path: 'movies/New' }]);
			});

			it('stores any number of titles with no TMDB ID', () => {
				const first = saveMedia(db, { type: 'movie', title: 'Home Video', path: 'movies/One', metadata: {} });
				saveMedia(db, { type: 'movie', title: 'Home Video', path: 'movies/Two', metadata: {} });

				expect(first.tmdbId).toBeNull();
				expect(rowCount(db, 'media')).toBe(2);
			});

			it('reads the typed columns from the payload', () => {
				const movie = saveMovie(db, { tmdbId: 7, path: 'movies/Seven', metadata: movieMetadata(7, 'Seven') });

				expect(movie).toMatchObject({
					title: 'Seven',
					year: 2024,
					releaseDate: '2024-05-01',
					runtime: 90,
					voteAverage: 7.5,
					voteCount: 10,
					popularity: 1.5,
				});
			});

			it('leaves the year empty when TMDB has no release date', () => {
				const metadata = movieMetadata(7, 'Seven');
				metadata.details.release_date = '';

				expect(saveMovie(db, { tmdbId: 7, path: 'movies/Seven', metadata })).toMatchObject({
					year: null,
					releaseDate: null,
				});
			});

			it('returns the payload as it was saved', () => {
				const metadata = movieMetadata(7, 'Seven');
				saveMovie(db, { tmdbId: 7, path: 'movies/Seven', metadata });

				expect(findMovie(db, 7)?.metadata).toEqual(metadata);
			});
		});

		describe('library', () => {
			const everything = { sort: 'title', order: 'asc', page: 1, pageSize: 10 } as const;
			const show = (tmdbId: number, title: string, genres: string[] = []) =>
				saveMedia(db, {
					type: 'show',
					tmdbId,
					title,
					year: 2020,
					path: `shows/${title}`,
					metadata: { details: { name: title, genres: genres.map((name, id) => ({ id, name })) } },
				});

			it('lists, searches and counts one media type, so that shows can use it too', () => {
				saveMovie(db, { tmdbId: 1, path: 'movies/Dark', metadata: movieMetadata(1, 'Dark Movie') });
				show(1, 'Dark Show', ['Mystery']);
				show(2, 'Light Show', ['Comedy']);

				expect(listLibrary(db, 'show', everything)).toMatchObject({
					items: [{ id: 1, title: 'Dark Show', genres: ['Mystery'] }, { title: 'Light Show' }],
					total: 2,
				});
				expect(listLibrary(db, 'show', { ...everything, q: 'dark' }).items.map(({ title }) => title)).toEqual([
					'Dark Show',
				]);
				expect(libraryFacets(db, 'show')).toMatchObject({
					year: { min: 2020, max: 2020 },
					genres: [
						{ name: 'Comedy', count: 1 },
						{ name: 'Mystery', count: 1 },
					],
					statuses: { 'not ready': 2 },
				});
			});

			it('leaves out a title with no TMDB ID, which no route could reach', () => {
				saveMedia(db, { type: 'movie', title: 'Home Video', path: 'movies/One', metadata: {} });

				expect(listLibrary(db, 'movie', everything)).toEqual({ items: [], total: 0 });
				expect(libraryFacets(db, 'movie').statuses['not ready']).toBe(0);
			});

			it('drops the genres and search entry of a removed title', () => {
				const metadata = movieMetadata(1, 'Dark Movie');
				metadata.details.genres = [{ id: 18, name: 'Drama' }];
				saveMovie(db, { tmdbId: 1, path: 'movies/Dark', metadata });
				expect(rowCount(db, 'media_genres')).toBe(1);

				db.$client.prepare('DELETE FROM media').run();

				expect(rowCount(db, 'media_genres')).toBe(0);
				expect(rowCount(db, 'media_search')).toBe(0);
			});
		});

		describe('transcode jobs', () => {
			const addMovie = (tmdbId = 7) =>
				saveMovie(db, { tmdbId, path: `movies/${tmdbId}`, metadata: movieMetadata(tmdbId, `Title ${tmdbId}`) });

			const request = { userId: 1, video: 'movies/7/clip.mp4', output: 'cache/7' };

			const failClaimedJob = () => failJob(db, claimNextJob(db)!.id, 'Bad file');

			it('reads as not ready before a job exists', () => {
				addMovie();

				expect(findMovie(db, 7)?.transcodeStatus).toBe('not ready');
				expect(listMovies(db)[0]?.transcodeStatus).toBe('not ready');
			});

			it('reads as the status clients know through each state of a job', () => {
				const movie = addMovie();

				queueTranscode(db, movie.id, request);
				expect(findMovie(db, 7)?.transcodeStatus).toBe('in progress');

				const job = claimNextJob(db)!;
				expect(findMovie(db, 7)?.transcodeStatus).toBe('in progress');

				finishJob(db, job.id);
				expect(findMovie(db, 7)?.transcodeStatus).toBe('ready');
			});

			it('reads as failed with its reason', () => {
				queueTranscode(db, addMovie().id, request);

				failClaimedJob();

				expect(findMovie(db, 7)).toMatchObject({ transcodeStatus: 'failed', transcodeError: 'Bad file' });
				expect(listMovies(db)[0]).toMatchObject({ transcodeStatus: 'failed', transcodeError: 'Bad file' });
			});

			it('keeps one job per title', () => {
				const movie = addMovie();

				queueTranscode(db, movie.id, request);
				queueTranscode(db, movie.id, { ...request, userId: 2 });

				expect(rowCount(db, 'jobs')).toBe(1);
			});

			it('keeps the status when a playlist is requested', () => {
				const movie = addMovie();
				queueTranscode(db, movie.id, request);
				finishJob(db, claimNextJob(db)!.id);

				recordPlaylistRequest(db, movie.id, new Date('2024-01-01T00:00:00Z'));

				expect(findMovie(db, 7)?.transcodeStatus).toBe('ready');
				expect(rowCount(db, 'jobs')).toBe(1);
			});

			it('refuses a job for a title that does not exist', () => {
				expect(() => queueTranscode(db, 999, request)).toThrow(/FOREIGN KEY/);
			});

			describe('claiming', () => {
				it('takes the oldest job, and counts a run', () => {
					queueTranscode(db, addMovie(7).id, request);
					queueTranscode(db, addMovie(8).id, request);

					const first = claimNextJob(db);

					expect(first).toMatchObject({ status: 'running', attempts: 1 });
					expect(first?.payload).toMatchObject({ video: 'movies/7/clip.mp4', output: 'cache/7' });
					expect(first?.mediaId).toBeLessThan(claimNextJob(db)!.mediaId!);
				});

				it('has nothing to take from an empty queue', () => {
					expect(claimNextJob(db)).toBeUndefined();
				});

				it('gives a job to one of two connections', () => {
					const other = openDatabase(file);
					queueTranscode(db, addMovie().id, request);

					const claims = [claimNextJob(db), claimNextJob(other)];

					closeDatabase(other);
					expect(claims.filter(Boolean)).toHaveLength(1);
				});

				it('skips jobs that are running, done or failed', () => {
					queueTranscode(db, addMovie(7).id, request);
					queueTranscode(db, addMovie(8).id, request);
					queueTranscode(db, addMovie(9).id, request);
					finishJob(db, claimNextJob(db)!.id);
					failClaimedJob();
					claimNextJob(db);

					expect(claimNextJob(db)).toBeUndefined();
				});
			});

			describe('recovery', () => {
				it('puts a job that was running back in the queue, and returns it', () => {
					queueTranscode(db, addMovie().id, request);
					const job = claimNextJob(db)!;

					const recovered = recoverJobs(db, 3);

					expect(recovered).toMatchObject([{ id: job.id, attempts: 1, payload: { output: 'cache/7' } }]);
					expect(claimNextJob(db)).toMatchObject({ id: job.id, attempts: 2 });
				});

				it('fails a job that has reached the limit, with a reason', () => {
					queueTranscode(db, addMovie().id, request);
					for (const _attempt of [1, 2]) {
						claimNextJob(db);
						recoverJobs(db, 3);
					}
					claimNextJob(db);

					recoverJobs(db, 3);

					expect(claimNextJob(db)).toBeUndefined();
					expect(findMovie(db, 7)).toMatchObject({
						transcodeStatus: 'failed',
						transcodeError: 'The worker stopped during all 3 attempts at this job.',
					});
				});

				it('leaves other jobs alone', () => {
					queueTranscode(db, addMovie(7).id, request);
					queueTranscode(db, addMovie(8).id, request);
					finishJob(db, claimNextJob(db)!.id);

					expect(recoverJobs(db, 3)).toEqual([]);
					expect(findMovie(db, 7)?.transcodeStatus).toBe('ready');
					expect(claimNextJob(db)?.attempts).toBe(1);
				});

				it('does not count a run that a clean shutdown stopped', () => {
					queueTranscode(db, addMovie().id, request);

					requeueJob(db, claimNextJob(db)!.id);

					expect(claimNextJob(db)?.attempts).toBe(1);
				});
			});

			describe('retrying', () => {
				it('requeues a failed job as new, for the user who asked', () => {
					const movie = addMovie();
					queueTranscode(db, movie.id, request);
					failClaimedJob();
					takeFinishedTranscodes(db);

					expect(retryTranscode(db, movie.id, { ...request, userId: 2, video: 'movies/7/new.mp4' })).toBe(true);

					expect(findMovie(db, 7)?.transcodeStatus).toBe('in progress');
					expect(findMovie(db, 7)?.transcodeError).toBeUndefined();
					const job = claimNextJob(db)!;
					expect(job.attempts).toBe(1);
					expect(job.payload).toMatchObject({ requestedBy: [2], video: 'movies/7/new.mp4' });
					finishJob(db, job.id);
					expect(takeFinishedTranscodes(db)).toEqual([{ status: 'done', title: 'Title 7', requestedBy: [2] }]);
				});

				it.each([
					['queued', () => {}],
					['running', () => claimNextJob(db)],
					['done', () => finishJob(db, claimNextJob(db)!.id)],
				])('leaves a %s job alone', (_status, prepare) => {
					const movie = addMovie();
					queueTranscode(db, movie.id, request);
					prepare();
					const before = findMovie(db, 7)?.transcodeStatus;

					expect(retryTranscode(db, movie.id, request)).toBe(false);

					expect(findMovie(db, 7)?.transcodeStatus).toBe(before);
				});

				it('has nothing to retry for a title with no job', () => {
					expect(retryTranscode(db, addMovie().id, request)).toBe(false);
				});
			});

			describe('announcing', () => {
				it('hands over a finished job once, with the users who asked once each', () => {
					const movie = addMovie();
					queueTranscode(db, movie.id, request);
					addTranscodeRequester(db, movie.id, 2);
					addTranscodeRequester(db, movie.id, 1);
					finishJob(db, claimNextJob(db)!.id);

					expect(takeFinishedTranscodes(db)).toEqual([{ status: 'done', title: 'Title 7', requestedBy: [1, 2] }]);
					expect(takeFinishedTranscodes(db)).toEqual([]);
				});

				it('hands over a failed job with its reason', () => {
					queueTranscode(db, addMovie().id, request);
					failClaimedJob();

					expect(takeFinishedTranscodes(db)).toEqual([
						{ status: 'failed', error: 'Bad file', title: 'Title 7', requestedBy: [1] },
					]);
				});

				it('waits for a job to finish', () => {
					queueTranscode(db, addMovie().id, request);
					claimNextJob(db);

					expect(takeFinishedTranscodes(db)).toEqual([]);
				});

				it('keeps a user who joined while the job ran', () => {
					const movie = addMovie();
					queueTranscode(db, movie.id, request);
					const job = claimNextJob(db)!;

					addTranscodeRequester(db, movie.id, 2);
					finishJob(db, job.id);

					expect(takeFinishedTranscodes(db)[0]?.requestedBy).toEqual([1, 2]);
				});

				it('keeps the users who asked when a playlist is requested', () => {
					const movie = addMovie();
					queueTranscode(db, movie.id, request);

					recordPlaylistRequest(db, movie.id, new Date('2024-01-01T00:00:00Z'));
					finishJob(db, claimNextJob(db)!.id);

					expect(takeFinishedTranscodes(db)[0]?.requestedBy).toEqual([1]);
				});

				it('has no one to tell about output that was already there', () => {
					markTranscodeDone(db, addMovie().id);

					expect(findMovie(db, 7)?.transcodeStatus).toBe('ready');
					expect(takeFinishedTranscodes(db)).toEqual([]);
				});
			});

			it('does nothing when a user joins a title with no job', () => {
				const movie = addMovie();

				addTranscodeRequester(db, movie.id, 1);

				expect(rowCount(db, 'jobs')).toBe(0);
			});
		});

		describe('scans', () => {
			const asked = new Date('2026-11-01T10:00:00Z');
			const result = {
				finishedAt: '2026-11-01T10:05:00.000Z',
				counts: { found: 1, added: 1, updated: 0, unmatched: 0, failed: 0 },
				errors: [],
			};

			it('has none until one is asked for', () => {
				expect(findLatestScan(db)).toBeUndefined();
			});

			it('queues a scan with the time it was asked for, and nobody to tell', () => {
				const scan = queueScan(db, asked);

				expect(scan).toMatchObject({ type: 'scan', status: 'queued', mediaId: null, announced: true });
				expect(scan?.payload.requestedAt).toBe('2026-11-01T10:00:00.000Z');
				expect(findLatestScan(db)?.id).toBe(scan?.id);
			});

			it('refuses a second while one is queued or running', () => {
				const scan = queueScan(db, asked);
				expect(queueScan(db, asked)).toBeUndefined();

				claimNextJob(db);
				expect(queueScan(db, asked)).toBeUndefined();

				expect(findLatestScan(db)?.id).toBe(scan?.id);
				expect(rowCount(db, 'jobs')).toBe(1);
			});

			it.each([
				['done', finishJob],
				['failed', (database: Database, id: number) => failJob(database, id, 'No')],
			] as const)('allows another once one is %s, and keeps only the latest', (_status, end) => {
				end(db, queueScan(db, asked)!.id);

				const next = queueScan(db, asked);

				expect(next?.status).toBe('queued');
				expect(findLatestScan(db)?.id).toBe(next?.id);
				expect(rowCount(db, 'jobs')).toBe(1);
			});

			it('keeps its result beside what it was asked', () => {
				const scan = queueScan(db, asked)!;

				recordScanResult(db, scan.id, result);

				expect(findLatestScan(db)?.payload).toEqual({ requestedAt: scan.payload.requestedAt, scanResult: result });
			});

			it('does not count as a transcode to announce', () => {
				finishJob(db, queueScan(db, asked)!.id);

				expect(takeFinishedTranscodes(db)).toEqual([]);
			});

			it('leaves transcodes out of its limit', () => {
				const movie = saveMovie(db, { tmdbId: 7, path: 'movies/Seven', metadata: movieMetadata(7, 'Seven') });
				queueTranscode(db, movie.id, { userId: 1, video: 'a.mp4', output: 'cache/7' });

				expect(queueScan(db, asked)?.status).toBe('queued');
			});
		});

		describe('backups', () => {
			it('queues one backup for a day', () => {
				expect(queueDailyBackup(db, '2026-11-01')).toBe(true);
				finishJob(db, claimNextJob(db)!.id);

				expect(queueDailyBackup(db, '2026-11-01')).toBe(false);
				expect(rowCount(db, 'jobs')).toBe(1);
				expect(getSetting(db, 'lastBackupDay')).toBe('2026-11-01');
			});

			it('queues the next day, and keeps only the latest job', () => {
				queueDailyBackup(db, '2026-11-01');
				finishJob(db, claimNextJob(db)!.id);

				expect(queueDailyBackup(db, '2026-11-02')).toBe(true);
				expect(rowCount(db, 'jobs')).toBe(1);
			});

			it('waits for a day whose backup is still active, without marking the new day', () => {
				queueDailyBackup(db, '2026-11-01');

				expect(queueDailyBackup(db, '2026-11-02')).toBe(false);
				expect(getSetting(db, 'lastBackupDay')).toBe('2026-11-01');

				finishJob(db, claimNextJob(db)!.id);
				expect(queueDailyBackup(db, '2026-11-02')).toBe(true);
			});

			it('does not try again on the day a backup failed', () => {
				queueDailyBackup(db, '2026-11-01');
				failJob(db, claimNextJob(db)!.id, 'The disk is full.');

				expect(queueDailyBackup(db, '2026-11-01')).toBe(false);
				expect(queueDailyBackup(db, '2026-11-02')).toBe(true);
			});

			it('repeats nothing when the clock moves back', () => {
				queueDailyBackup(db, '2026-11-02');
				finishJob(db, claimNextJob(db)!.id);

				expect(queueDailyBackup(db, '2026-11-01')).toBe(false);
			});

			it('copies the database to a file that opens and holds the data', () => {
				createUser(db, { username: 'sam', passwordHash: 'hash' });
				const file = path.join(folder, 'backup.db');

				backupDatabase(db, file);

				const copy = openDatabase(file);
				expect(isDatabaseMigrated(copy)).toBe(true);
				expect(findUserByUsername(copy, 'sam')?.passwordHash).toBe('hash');
				closeDatabase(copy);
			});

			it('refuses to write over a file', () => {
				const file = path.join(folder, 'backup.db');
				backupDatabase(db, file);

				expect(() => backupDatabase(db, file)).toThrow();
			});
		});

		describe('settings', () => {
			it('keeps one row when a setting is written again', () => {
				setSetting(db, 'lastScanTime', 'first');
				setSetting(db, 'lastScanTime', 'second');

				expect(rowCount(db, 'settings')).toBe(1);
				expect(getSetting(db, 'lastScanTime')).toBe('second');
			});

			it('has no value for an unknown key', () => {
				expect(getSetting(db, 'unknown')).toBeUndefined();
			});
		});

		describe('users', () => {
			const user = { username: 'sam', passwordHash: 'hash' };

			it('gives a new user the plain role', () => {
				expect(createUser(db, user).role).toBe('user');
			});

			it('refuses a username twice', () => {
				createUser(db, user);

				expect(() => createUser(db, user)).toThrow(/UNIQUE/);
			});

			it('finds no unknown user', () => {
				expect(findUserByUsername(db, 'nobody')).toBeUndefined();
			});

			it('creates an owner', () => {
				expect(hasOwner(db)).toBe(false);

				expect(createOwner(db, user)?.role).toBe('owner');

				expect(hasOwner(db)).toBe(true);
			});

			it('creates no second owner, and leaves the first alone', () => {
				createOwner(db, user);

				expect(createOwner(db, { username: 'second', passwordHash: 'hash' })).toBeUndefined();

				expect(rowCount(db, 'users')).toBe(1);
			});

			it('refuses a second owner at the database, whatever the code does', () => {
				createOwner(db, user);

				expect(() => createUser(db, { username: 'second', passwordHash: 'hash', role: 'owner' })).toThrow(/UNIQUE/);
			});

			it('creates no owner with a taken username', () => {
				createUser(db, user);

				expect(createOwner(db, user)).toBeUndefined();
				expect(hasOwner(db)).toBe(false);
			});

			it('allows any number of admins and users', () => {
				createUser(db, { username: 'one', passwordHash: 'hash', role: 'admin' });
				createUser(db, { username: 'two', passwordHash: 'hash', role: 'admin' });
				createOwner(db, user);

				expect(rowCount(db, 'users')).toBe(3);
			});
		});

		describe('sessions', () => {
			const expiresAt = new Date('2030-01-01T00:00:00Z');

			const addSession = (id = 'hash') => {
				const user = createUser(db, { username: `user-of-${id}`, passwordHash: 'secret hash', role: 'admin' });
				createSession(db, { id, userId: user.id, expiresAt });
				return user;
			};

			it('finds a session with its user, and no password hash', () => {
				const user = addSession();

				expect(findSession(db, 'hash')).toEqual({
					id: 'hash',
					userId: user.id,
					expiresAt,
					user: { id: user.id, username: user.username, role: 'admin' },
				});
			});

			it('finds no unknown session', () => {
				expect(findSession(db, 'unknown')).toBeUndefined();
			});

			it('moves the expiry of one session', () => {
				addSession('one');
				addSession('two');
				const later = new Date('2031-01-01T00:00:00Z');

				extendSession(db, 'one', later);

				expect(findSession(db, 'one')?.expiresAt).toEqual(later);
				expect(findSession(db, 'two')?.expiresAt).toEqual(expiresAt);
			});

			it('deletes one session', () => {
				addSession('one');
				addSession('two');

				deleteSession(db, 'one');

				expect(findSession(db, 'one')).toBeUndefined();
				expect(findSession(db, 'two')).toBeDefined();
			});

			it('deletes only expired sessions', () => {
				addSession();

				deleteExpiredSessions(db, new Date(expiresAt.getTime() - 1));
				expect(rowCount(db, 'sessions')).toBe(1);

				deleteExpiredSessions(db, expiresAt);
				expect(rowCount(db, 'sessions')).toBe(0);
			});

			it('goes with its user', () => {
				const user = addSession();

				db.$client.prepare('DELETE FROM users WHERE id = ?').run(user.id);

				expect(rowCount(db, 'sessions')).toBe(0);
			});
		});
	});
});
