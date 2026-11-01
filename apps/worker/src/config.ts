import path from 'node:path';
import { z } from 'zod';

/**
 * Configuration
 * The only code in this app that reads the environment. The worker uses the same variables as
 * the API, so that one file sets both. Messages name variables and never include a value.
 */

const loadEnvFile = (file: string) => {
	try {
		process.loadEnvFile(file);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
			throw error;
		}
	}
};

// Only `pnpm dev` has this file. A variable that is already set wins.
loadEnvFile('../api/.env');

/** An empty value, such as `PORT=` in a `.env`, means the variable is not set. */
const optional = <T extends z.ZodType>(schema: T) =>
	z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const positiveNumber = z
	.string()
	.regex(/^[1-9]\d*$/, 'must be a whole number from 1 upwards')
	.transform(Number);

const environmentSchema = z.object({
	DATABASE_PATH: optional(z.string()),
	MEDIA_FOLDER: optional(z.string()),
	BACKUP_FOLDER: optional(z.string()),
	JOB_CONCURRENCY: optional(positiveNumber),
	TMDB_API_READ_ACCESS_TOKEN: optional(z.string()),
});

const parseEnvironment = () => {
	const result = environmentSchema.safeParse(process.env);
	if (result.success) {
		return result.data;
	}
	const problems = result.error.issues.map(({ path: [name], message }) => `  ${String(name)} ${message}`);
	console.error(`The worker cannot start, because its configuration is invalid:\n${problems.join('\n')}`);
	process.exit(1);
};

const environment = parseEnvironment();

export const config = {
	/** The SQLite file. By default it is in the repository's `data` folder, as for the API. */
	databasePath: path.resolve(environment.DATABASE_PATH ?? path.join(__dirname, '../../../data/app.db')),
	/** The library, which scans read and transcodes cache under. By default it is the API's folder. */
	mediaFolder: path.resolve(environment.MEDIA_FOLDER ?? path.join(__dirname, '../../api/media')),
	/** Where daily backups go. By default it is the repository's `backups` folder. */
	backupFolder: path.resolve(environment.BACKUP_FOLDER ?? path.join(__dirname, '../../../backups')),
	/** How many jobs run at once. */
	jobConcurrency: environment.JOB_CONCURRENCY ?? 1,
	/** Empty when none is set. A scan then fails and says so. */
	tmdbToken: environment.TMDB_API_READ_ACCESS_TOKEN ?? '',
};
