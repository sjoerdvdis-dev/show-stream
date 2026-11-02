import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import {
	claimNextJob,
	closeDatabase,
	createUser,
	findUserByUsername,
	migrateDatabase,
	openDatabase,
	queueDailyBackup,
	recoverJobs,
	type Database,
	type Job,
} from '@workspace/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backup, dayOf } from '../src/backup';
import { createJobLoop } from '../src/job-loop';

const day = (date: string) => new Date(`${date}T12:00:00Z`);

describe('backup', () => {
	let folder: string;
	let backups: string;
	let db: Database;
	const running = new AbortController().signal;

	const runBackup = (date: string) => backup(db, backups, day(date), running);

	beforeEach(async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		folder = await mkdtemp(path.join(tmpdir(), 'show-stream-backup-test-'));
		backups = path.join(folder, 'backups');
		db = openDatabase(path.join(folder, 'app.db'));
		migrateDatabase(db);
	});

	afterEach(async () => {
		closeDatabase(db);
		vi.restoreAllMocks();
		await rm(folder, { recursive: true, force: true });
	});

	it('writes a file that opens and holds the data, including writes still in the WAL', async () => {
		createUser(db, { username: 'sam', passwordHash: 'hash' });

		await runBackup('2026-11-01');

		expect(await readdir(backups)).toEqual(['show-stream-2026-11-01.db']);
		const copy = openDatabase(path.join(backups, 'show-stream-2026-11-01.db'));
		expect(findUserByUsername(copy, 'sam')?.passwordHash).toBe('hash');
		closeDatabase(copy);
	});

	it('keeps the latest 7, and nothing else in the folder is touched', async () => {
		await mkdir(backups);
		await writeFile(path.join(backups, 'notes.txt'), 'mine');
		await writeFile(path.join(backups, 'show-stream-manual.db'), 'mine');

		for (let date = 1; date <= 9; date++) {
			await runBackup(`2026-11-0${date}`);
		}

		expect((await readdir(backups)).sort()).toEqual([
			'notes.txt',
			'show-stream-2026-11-03.db',
			'show-stream-2026-11-04.db',
			'show-stream-2026-11-05.db',
			'show-stream-2026-11-06.db',
			'show-stream-2026-11-07.db',
			'show-stream-2026-11-08.db',
			'show-stream-2026-11-09.db',
			'show-stream-manual.db',
		]);
	});

	it('keeps the file of a day that has one, as after a restore', async () => {
		await runBackup('2026-11-01');
		const file = path.join(backups, 'show-stream-2026-11-01.db');
		const { mtimeMs } = await stat(file);

		await sleep(5);
		await runBackup('2026-11-01');

		expect((await stat(file)).mtimeMs).toBe(mtimeMs);
	});

	it('removes what a killed run left, which never looks like a backup', async () => {
		await mkdir(backups);
		await writeFile(path.join(backups, 'show-stream-2026-10-31.db.partial'), 'half a file');

		await runBackup('2026-11-01');

		expect(await readdir(backups)).toEqual(['show-stream-2026-11-01.db']);
	});

	it('leaves no partial file when the copy fails', async () => {
		const closed = openDatabase(path.join(folder, 'closed.db'));
		closeDatabase(closed);

		await expect(backup(closed, backups, day('2026-11-01'), running)).rejects.toThrow();

		expect(await readdir(backups)).toEqual([]);
	});

	it('stops before it starts during a shutdown', async () => {
		const stopping = new AbortController();
		stopping.abort(new Error('The worker is shutting down.'));

		await expect(backup(db, backups, day('2026-11-01'), stopping.signal)).rejects.toThrow('shutting down');

		expect(await readdir(backups)).toEqual([]);
	});

	it('names a backup after the UTC day', () => {
		expect(dayOf(new Date('2026-11-01T23:59:59Z'))).toBe('2026-11-01');
		expect(dayOf(new Date('2026-11-02T00:00:00Z'))).toBe('2026-11-02');
	});

	describe('across a restart', () => {
		const backupJobs = () => db.$client.prepare(`SELECT status FROM jobs WHERE type = 'backup'`).all();

		const runQueuedJobs = async (date: string) => {
			const finished: Job[] = [];
			const notUsed = () => Promise.reject(new Error('These tests queue only backups.'));
			const loop = createJobLoop(
				db,
				{
					transcode: notUsed,
					scan: notUsed,
					backup: async (job, signal) => {
						await backup(db, backups, day(date), signal);
						finished.push(job);
					},
				},
				1,
			);
			loop.start();
			await vi.waitFor(() => expect(finished).toHaveLength(1));
			await loop.stop();
		};

		it('finishes a backup whose worker died, and does not repeat it', async () => {
			queueDailyBackup(db, '2026-11-01');
			claimNextJob(db);

			// A new worker starts: recovery first, then the first check of the schedule.
			expect(recoverJobs(db, 3)).toHaveLength(1);
			expect(queueDailyBackup(db, '2026-11-01')).toBe(false);
			await runQueuedJobs('2026-11-01');

			expect(await readdir(backups)).toEqual(['show-stream-2026-11-01.db']);
			expect(backupJobs()).toEqual([{ status: 'done' }]);
			expect(queueDailyBackup(db, '2026-11-01')).toBe(false);
		});

		it('takes the next day, and then the day after a gap', async () => {
			queueDailyBackup(db, '2026-11-01');
			await runQueuedJobs('2026-11-01');

			expect(queueDailyBackup(db, '2026-11-02')).toBe(true);
			await runQueuedJobs('2026-11-02');
			expect(queueDailyBackup(db, '2026-11-09')).toBe(true);
			await runQueuedJobs('2026-11-09');

			expect((await readdir(backups)).sort()).toEqual([
				'show-stream-2026-11-01.db',
				'show-stream-2026-11-02.db',
				'show-stream-2026-11-09.db',
			]);
		});
	});
});
