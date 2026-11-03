import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import type { MovieMetadata } from '@workspace/contract/api-types';
import {
	closeDatabase,
	createUser,
	extendSession,
	findSession,
	findUserByUsername,
	migrateDatabase,
	openDatabase,
	saveMovie,
	setSetting,
	type Database,
	type UserRole,
} from '@workspace/db';
import type { TestApi, TestClient } from './api';

export type SeededMovie = {
	id: number;
	title: string;
	/** Folder inside the media folder, in the form the scan would store. */
	folder: string;
};

const withDatabase = <T>(databasePath: string, use: (db: Database) => T): T => {
	const db = openDatabase(databasePath);
	try {
		return use(db);
	} finally {
		closeDatabase(db);
	}
};

/** TMDB fields of a seeded movie, such as `runtime` or `genres`, which win over the defaults. */
export type MovieDetails = Record<string, unknown>;

const movieRow = (id: number, title: string, details: MovieDetails = {}) => ({
	tmdbId: id,
	path: `movies/${title} (2024)`,
	metadata: {
		details: { id, title, release_date: '2024-01-01', ...details },
		credits: { cast: [], crew: [] },
		images: { posters: [], backdrops: [], logos: [] },
	} as unknown as MovieMetadata,
});

/**
 * Adds a movie the way a successful scan would.
 *
 * This file is the only place that touches the database directly, because a scan needs
 * TMDB, only setup creates a user, and no route shows a session's row.
 */
export const seedMovie = async (
	api: TestApi,
	id: number,
	title = `Movie ${id}`,
	details: MovieDetails = {},
): Promise<SeededMovie> => {
	const movie = movieRow(id, title, details);
	await mkdir(path.join(api.mediaFolder, movie.path), { recursive: true });

	withDatabase(api.databasePath, (db) => saveMovie(db, movie));

	return { id, title, folder: movie.path };
};

/** Adds an account, because only setup creates one through the API. */
export const addUser = async (api: TestApi, username: string, password: string, role: UserRole = 'user') => {
	const passwordHash = await bcrypt.hash(password, 4);
	withDatabase(api.databasePath, (db) => createUser(db, { username, passwordHash, role }));
};

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

/** The stored row of a client's session, found by the hash of its token. */
export const sessionRow = (api: TestApi, client: TestClient) =>
	withDatabase(api.databasePath, (db) => findSession(db, tokenHash(client.token)));

/** Whether any session row has this exact ID. */
export const hasSessionWithId = (api: TestApi, id: string) =>
	withDatabase(api.databasePath, (db) => findSession(db, id) !== undefined);

export const setSessionExpiry = (api: TestApi, client: TestClient, expiresAt: Date) => {
	withDatabase(api.databasePath, (db) => extendSession(db, tokenHash(client.token), expiresAt));
};

const migrationsFolder = path.resolve(import.meta.dirname, '../../../../packages/db/migrations');

/** Applies the migrations up to and including `lastTag`, by hiding the later ones. */
const migrateUpTo = async (db: Database, lastTag: string) => {
	const folder = await mkdtemp(path.join(tmpdir(), 'show-stream-old-migrations-'));
	try {
		await cp(migrationsFolder, folder, { recursive: true });
		const journalPath = path.join(folder, 'meta', '_journal.json');
		const journal = JSON.parse(await readFile(journalPath, 'utf8'));
		const last = journal.entries.findIndex((entry: { tag: string }) => entry.tag === lastTag);
		journal.entries = journal.entries.slice(0, last + 1);
		await writeFile(journalPath, JSON.stringify(journal));
		migrateDatabase(db, folder);
	} finally {
		await rm(folder, { recursive: true, force: true });
	}
};

/** Builds a database as the versions before first-run setup left it, with their default account. */
export const createDatabaseWithDefaultAccount = async (databasePath: string) => {
	const db = openDatabase(databasePath);
	try {
		await migrateUpTo(db, '0000_initial');
		createUser(db, { username: 'admin', passwordHash: await bcrypt.hash('admin', 4), role: 'admin' });
		createUser(db, { username: 'sam', passwordHash: await bcrypt.hash('correct horse', 4) });
	} finally {
		closeDatabase(db);
	}
};

type OldJob = { title: string; status: string };

/** Builds a database from before the worker, with a job of each status the API then wrote. */
export const createDatabaseWithOldJobs = async (databasePath: string, oldJobs: OldJob[]) => {
	const db = openDatabase(databasePath);
	try {
		await migrateUpTo(db, '0002_remove_default_account');
		oldJobs.forEach(({ title, status }, index) => {
			const movie = saveMovie(db, movieRow(7000 + index, title));
			db.$client
				.prepare(`INSERT INTO jobs (type, media_id, status) VALUES ('transcode', ?, ?)`)
				.run(movie.id, status);
		});
	} finally {
		closeDatabase(db);
	}
};

export type JobRow = { status: string; attempts: number; error: string | null };

/** The stored row of a title's transcode job. Clients see only a status derived from it. */
export const jobRow = (api: TestApi, movie: SeededMovie) =>
	withDatabase(api.databasePath, (db) =>
		db.$client
			.prepare<[number], JobRow>(
				`SELECT jobs.status, jobs.attempts, jobs.error FROM jobs
				JOIN media ON media.id = jobs.media_id WHERE media.tmdb_id = ?`,
			)
			.get(movie.id),
	);

/** The stored row of the latest backup job. Nothing shows backups through the API. */
export const backupJobRow = (api: TestApi) =>
	withDatabase(api.databasePath, (db) =>
		db.$client
			.prepare<[], JobRow & { id: number }>(
				`SELECT id, status, attempts, error FROM jobs WHERE type = 'backup' ORDER BY id DESC`,
			)
			.get(),
	);

/** Stands for a worker that last queued a backup on this day. */
export const setLastBackupDay = (api: TestApi, day: string) => {
	withDatabase(api.databasePath, (db) => setSetting(db, 'lastBackupDay', day));
};

/** Reads a user from a backup file, which proves that the file opens and holds the data. */
export const findUserInBackup = (file: string, username: string) =>
	withDatabase(file, (db) => findUserByUsername(db, username));

/** Removes every title, so that each test of a shared server starts with an empty library. */
export const clearLibrary = (api: TestApi) => {
	withDatabase(api.databasePath, (db) => db.$client.prepare('DELETE FROM media').run());
};

/** Writes a file that has a video extension but is not a video. */
export const addCorruptVideo = async (api: TestApi, movie: SeededMovie) => {
	await writeFile(path.join(api.mediaFolder, movie.folder, 'corrupt.mp4'), 'This is not a video.');
};
