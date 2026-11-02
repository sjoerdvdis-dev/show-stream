import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { backupDatabase, type Database } from '@workspace/db';

const keptBackups = 7;
const backupName = /^show-stream-\d{4}-\d{2}-\d{2}\.db$/;
const partialName = /^show-stream-\d{4}-\d{2}-\d{2}\.db\.partial$/;

/** The UTC day of a date, as `YYYY-MM-DD`, which names and schedules its backup. */
export const dayOf = (date: Date) => date.toISOString().slice(0, 10);

const exists = (file: string) =>
	stat(file).then(
		() => true,
		() => false,
	);

const removeFiles = (folder: string, names: string[]) =>
	Promise.all(names.map((name) => rm(path.join(folder, name), { force: true })));

/**
 * Writes the day's backup and keeps the latest 7. The copy moves to its final name only once
 * it is complete, so that a killed run leaves nothing that looks like a backup. Only names
 * this function writes are touched, so anything else in the folder stays.
 *
 * A day that already has a backup keeps it. A job run again must not write twice, and after
 * a restore, the live database is older than the backup that names today.
 */
export const backup = async (db: Database, folder: string, now: Date, signal: AbortSignal) => {
	await mkdir(folder, { recursive: true });
	await removeFiles(
		folder,
		(await readdir(folder)).filter((name) => partialName.test(name)),
	);

	const file = path.join(folder, `show-stream-${dayOf(now)}.db`);
	if (!(await exists(file))) {
		const partial = `${file}.partial`;
		signal.throwIfAborted();
		try {
			backupDatabase(db, partial);
			await rename(partial, file);
		} catch (error) {
			await rm(partial, { force: true });
			throw error;
		}
	}

	const backups = (await readdir(folder)).filter((name) => backupName.test(name)).sort();
	await removeFiles(folder, backups.slice(0, -keptBackups));
};
