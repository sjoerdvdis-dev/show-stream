import { statSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { MovieMetadata } from '@workspace/contract/api-types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	addTranscodeRequester,
	closeDatabase,
	createOwner,
	createSession,
	createUser,
	deleteExpiredSessions,
	deleteSession,
	extendSession,
	findMovie,
	findSession,
	findUserByUsername,
	getSetting,
	hasOwner,
	listMovies,
	listShows,
	migrateDatabase,
	openDatabase,
	recordPlaylistRequest,
	saveMedia,
	saveMovie,
	setSetting,
	setTranscodeStatus,
	takeTranscodeRequesters,
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
		});

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

		describe('transcode jobs', () => {
			const addMovie = () => saveMovie(db, { tmdbId: 7, path: 'movies/Seven', metadata: movieMetadata(7, 'Seven') });

			it('reads as not ready before a job exists', () => {
				addMovie();

				expect(findMovie(db, 7)?.transcodeStatus).toBe('not ready');
				expect(listMovies(db)[0]?.transcodeStatus).toBe('not ready');
			});

			it('keeps one job per title as its status changes', () => {
				const movie = addMovie();

				setTranscodeStatus(db, movie.id, 'in progress');
				setTranscodeStatus(db, movie.id, 'ready');

				expect(rowCount(db, 'jobs')).toBe(1);
				expect(findMovie(db, 7)?.transcodeStatus).toBe('ready');
			});

			it('keeps the status when a playlist is requested', () => {
				const movie = addMovie();
				setTranscodeStatus(db, movie.id, 'ready');

				recordPlaylistRequest(db, movie.id, new Date('2024-01-01T00:00:00Z'));

				expect(findMovie(db, 7)?.transcodeStatus).toBe('ready');
				expect(rowCount(db, 'jobs')).toBe(1);
			});

			it('refuses a job for a title that does not exist', () => {
				expect(() => setTranscodeStatus(db, 999, 'ready')).toThrow(/FOREIGN KEY/);
			});

			it('hands over the users who asked once each, and only once', () => {
				const movie = addMovie();
				setTranscodeStatus(db, movie.id, 'in progress');

				addTranscodeRequester(db, movie.id, 1);
				addTranscodeRequester(db, movie.id, 2);
				addTranscodeRequester(db, movie.id, 1);

				expect(takeTranscodeRequesters(db, movie.id)).toEqual([1, 2]);
				expect(takeTranscodeRequesters(db, movie.id)).toEqual([]);
			});

			it('keeps the users who asked when a playlist is requested', () => {
				const movie = addMovie();
				setTranscodeStatus(db, movie.id, 'in progress');
				addTranscodeRequester(db, movie.id, 1);

				recordPlaylistRequest(db, movie.id, new Date('2024-01-01T00:00:00Z'));

				expect(takeTranscodeRequesters(db, movie.id)).toEqual([1]);
			});

			it('has no users for a title with no job', () => {
				const movie = addMovie();

				addTranscodeRequester(db, movie.id, 1);

				expect(takeTranscodeRequesters(db, movie.id)).toEqual([]);
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
