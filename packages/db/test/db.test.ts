import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { MovieMetadata } from '@workspace/contract/api-types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	closeDatabase,
	createUser,
	createUserIfMissing,
	findMovie,
	findUserByUsername,
	getSetting,
	listMovies,
	listShows,
	migrateDatabase,
	openDatabase,
	recordPlaylistRequest,
	saveMedia,
	saveMovie,
	setSetting,
	setTranscodeStatus,
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

			expect(tableNames(db)).toEqual(expect.arrayContaining(['jobs', 'media', 'settings', 'users']));
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

			it('leaves an existing account alone', () => {
				createUser(db, user);

				createUserIfMissing(db, { ...user, passwordHash: 'other' });

				expect(findUserByUsername(db, 'sam')?.passwordHash).toBe('hash');
			});

			it('finds no unknown user', () => {
				expect(findUserByUsername(db, 'nobody')).toBeUndefined();
			});
		});
	});
});
