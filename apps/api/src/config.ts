import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

/**
 * Configuration
 * The only code in this app that reads the environment. Importing it parses the
 * environment, and stops the process with a list of every problem if it is invalid.
 * Messages name variables and never include a value, because a value may be a secret.
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

// A variable that is already set wins, so the first file overrides the second.
loadEnvFile('.env');
loadEnvFile(process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development');

const required = z.string({ error: 'is required' }).min(1, 'is required');

/** An empty value, such as `PORT=` in a `.env`, means the variable is not set. */
const optional = <T extends z.ZodType>(schema: T) =>
	z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const wholeNumber = z.string().regex(/^\d+$/, 'must be a whole number').transform(Number);

const port = wholeNumber.refine((value) => value >= 1 && value <= 65535, 'must be a port from 1 to 65535');

const isFolder = (folder: string) => fs.statSync(folder, { throwIfNoEntry: false })?.isDirectory() === true;

const environmentSchema = z.object({
	PORT: optional(port),
	NEXT_CLIENT_URL: optional(z.string()),
	MONGO_DB_URL: required,
	MONGO_DB_PORT: optional(port),
	MONGO_DB_USERNAME: required,
	MONGO_DB_PASSWORD: required,
	JWT_SECRET: required,
	JWT_EXPIRES_IN: z
		.string({ error: 'is required' })
		.pipe(wholeNumber)
		.refine((value) => value > 0, 'must be above zero'),
	TMDB_API_READ_ACCESS_TOKEN: optional(z.string()),
	MEDIA_FOLDER: optional(z.string().refine(isFolder, 'must be an existing folder')),
});

const parseEnvironment = () => {
	const result = environmentSchema.safeParse(process.env);
	if (result.success) {
		return result.data;
	}
	const problems = result.error.issues.map(({ path: [name], message }) => `  ${String(name)} ${message}`);
	console.error(`The API cannot start, because its configuration is invalid:\n${problems.join('\n')}`);
	process.exit(1);
};

const environment = parseEnvironment();

export const config = {
	port: environment.PORT ?? 5000,
	nextClientUrl: environment.NEXT_CLIENT_URL ?? '',
	mongo: {
		host: environment.MONGO_DB_URL,
		port: environment.MONGO_DB_PORT ?? 27017,
		username: environment.MONGO_DB_USERNAME,
		password: environment.MONGO_DB_PASSWORD,
	},
	jwt: {
		secret: environment.JWT_SECRET,
		expiresInSeconds: environment.JWT_EXPIRES_IN,
	},
	tmdbToken: environment.TMDB_API_READ_ACCESS_TOKEN ?? '',
	/** The library: scans read it, and transcodes cache under it. Always absolute. */
	mediaFolder: path.resolve(environment.MEDIA_FOLDER ?? path.join(__dirname, '../media')),
};
