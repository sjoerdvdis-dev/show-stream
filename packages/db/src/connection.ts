import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import Sqlite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const busyTimeoutMs = 5_000;

/** Beside `src` and `dist`, so that it resolves the same from either. */
const migrationsFolder = path.resolve(import.meta.dirname, '../migrations');

/** The one way to open the database, so that the API and the worker behave alike. */
export const openDatabase = (file: string) => {
	mkdirSync(path.dirname(file), { recursive: true });
	const client = new Sqlite(file);
	client.pragma('journal_mode = WAL');
	client.pragma(`busy_timeout = ${busyTimeoutMs}`);
	client.pragma('foreign_keys = ON');
	return drizzle(client);
};

export type Database = ReturnType<typeof openDatabase>;

/**
 * Applies every migration this install has not run yet. Throws if one fails.
 *
 * @param folder Only tests pass this, to build a database as an older version left it.
 */
export const migrateDatabase = (db: Database, folder = migrationsFolder) => {
	migrate(db, { migrationsFolder: folder });
};

/**
 * Whether every migration this version ships has been applied. Only the API migrates, so
 * anything else that opens the file waits for this. A database ahead of this version also passes.
 */
export const isDatabaseMigrated = (db: Database) => {
	const journal = JSON.parse(readFileSync(path.join(migrationsFolder, 'meta', '_journal.json'), 'utf8'));
	const latest: number = journal.entries.at(-1).when;
	const hasTable = db.$client
		.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'`)
		.get();
	if (!hasTable) {
		return false;
	}
	const applied = db.$client
		.prepare<[], { createdAt: number | null }>('SELECT max(created_at) AS createdAt FROM __drizzle_migrations')
		.get();
	return (applied?.createdAt ?? 0) >= latest;
};

export const closeDatabase = (db: Database) => {
	db.$client.close();
};
