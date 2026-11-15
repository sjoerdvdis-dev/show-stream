import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const boundsSchema = z.object({
	x: z.number().int(),
	y: z.number().int(),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
});

const settingsSchema = z.object({
	/** The chosen server's origin, such as `https://media.example.com`. */
	server: z.string().optional().catch(undefined),
	window: z
		.object({ bounds: boundsSchema, maximized: z.boolean() })
		.optional()
		.catch(undefined),
});

export type Settings = z.infer<typeof settingsSchema>;
export type WindowState = NonNullable<Settings['window']>;

/**
 * The app's own settings, in one JSON file in its user data folder. The session cookie is not
 * here: it lives in the window's persistent session, beside it.
 */
export const settingsStore = (folder: string) => {
	const file = join(folder, 'settings.json');

	const read = (): Settings => {
		try {
			return settingsSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
		} catch {
			return {};
		}
	};

	/** Writes beside the file and renames, so that a crash never leaves half a file. */
	const update = (change: Partial<Settings>) => {
		const next = { ...read(), ...change };
		writeFileSync(`${file}.tmp`, `${JSON.stringify(next, null, '\t')}\n`);
		renameSync(`${file}.tmp`, file);
	};

	return { read, update };
};
