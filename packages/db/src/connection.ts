import { mkdirSync } from 'node:fs';
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

/** Applies every migration this install has not run yet. Throws if one fails. */
export const migrateDatabase = (db: Database) => {
	migrate(db, { migrationsFolder });
};

export const closeDatabase = (db: Database) => {
	db.$client.close();
};
