import { setTimeout as sleep } from 'node:timers/promises';
import { closeDatabase, isDatabaseMigrated, openDatabase, recoverJobs, type Database } from '@workspace/db';
import { config } from './config';
import { createJobLoop, type JobHandlers } from './job-loop';
import { removePartialOutput, transcode } from './transcode';

/** After this many runs that ended with the worker dying, a job has failed. */
const maxAttempts = 3;
const schemaRetryMs = 500;

const handlers: JobHandlers = {
	transcode: (job, signal) => transcode(config.mediaFolder, job, signal),
};

let stopping = false;

const stopRequested = new Promise<void>((resolve) => {
	for (const signal of ['SIGTERM', 'SIGINT'] as const) {
		process.once(signal, () => {
			stopping = true;
			resolve();
		});
	}
});

/**
 * Only the API migrates, and Compose health checks arrive later, so the worker may start
 * first. Until then, opening the file can fail too, while the API switches it to WAL.
 */
const waitForDatabase = async (): Promise<Database | undefined> => {
	while (!stopping) {
		let db: Database | undefined;
		try {
			db = openDatabase(config.databasePath);
			if (isDatabaseMigrated(db)) {
				return db;
			}
		} catch (error) {
			console.error('Could not open the database yet:', error);
		}
		if (db) {
			closeDatabase(db);
		}
		console.log('Waiting for the API to migrate the database');
		await sleep(schemaRetryMs);
	}
	return undefined;
};

/** Every `running` job is from a dead process, because this one has not started any. */
const recover = async (db: Database) => {
	for (const job of recoverJobs(db, maxAttempts)) {
		await removePartialOutput(config.mediaFolder, job);
		console.log(`Recovered ${job.type} job ${job.id} after attempt ${job.attempts}`);
	}
};

const main = async () => {
	const db = await waitForDatabase();
	if (!db) {
		return;
	}

	await recover(db);

	const loop = createJobLoop(db, handlers, config.jobConcurrency);
	loop.start();
	console.log(`Worker is running, with up to ${config.jobConcurrency} jobs at once`);

	await stopRequested;
	await loop.stop();
	closeDatabase(db);
	console.log('Worker stopped');
};

main().catch((error) => {
	console.error('The worker stopped, because of an unexpected error:', error);
	process.exit(1);
});
