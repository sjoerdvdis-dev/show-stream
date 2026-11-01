import { migrateDatabase, openDatabase, type Database } from '@workspace/db';
import { config } from './config';

/**
 * Database
 * Importing this opens the database and applies its migrations, and stops the process if
 * either fails. Code that can reach the database therefore always sees a current schema.
 */

const openMigratedDatabase = (): Database => {
	try {
		const db = openDatabase(config.databasePath);
		migrateDatabase(db);
		return db;
	} catch (error) {
		console.error('The API cannot start, because its database could not be opened or migrated:', error);
		process.exit(1);
	}
};

export const db: Database = openMigratedDatabase();
