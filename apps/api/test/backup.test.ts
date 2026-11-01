import { readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ownerCredentials, startApi, type TestApi } from './support/api';
import { backupJobRow, findUserInBackup, setLastBackupDay } from './support/seed';

// The worker reads a real clock, so a missed day is staged by moving the stored day back.
const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const todaysBackup = `show-stream-${today}.db`;

describe('the daily backup', () => {
	let api: TestApi;

	const backups = () => readdir(api.backupFolder).catch(() => []);

	const backupFinished = () =>
		api.waitFor(async () => {
			expect(await backups()).toContain(todaysBackup);
			expect(backupJobRow(api)?.status).toBe('done');
		});

	beforeAll(async () => {
		api = await startApi();
		await api.createOwner();
		await backupFinished();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('runs when the worker first starts', async () => {
		expect(await backups()).toEqual([todaysBackup]);
	});

	it('is not repeated by a clean restart on the same day', async () => {
		const job = backupJobRow(api);
		const { mtimeMs } = await stat(path.join(api.backupFolder, todaysBackup));

		await api.stopWorkers();
		await api.startWorker();

		expect(backupJobRow(api)).toEqual(job);
		expect((await stat(path.join(api.backupFolder, todaysBackup))).mtimeMs).toBe(mtimeMs);
	});

	it('is not repeated by a crash on the same day', async () => {
		const job = backupJobRow(api);

		await api.killWorkers();
		await api.startWorker();

		expect(backupJobRow(api)).toEqual(job);
	});

	it('is taken at the next start after a day the worker missed, and holds the data', async () => {
		await api.stopWorkers();
		setLastBackupDay(api, yesterday);
		await rm(path.join(api.backupFolder, todaysBackup));

		await api.startWorker();
		await backupFinished();

		const copy = findUserInBackup(path.join(api.backupFolder, todaysBackup), ownerCredentials.username);
		expect(copy?.role).toBe('owner');
	});
});
