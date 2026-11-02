import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import type { MovieMetadata } from '@workspace/contract/api-types';
import {
	closeDatabase,
	findMovie,
	listMovies,
	migrateDatabase,
	openDatabase,
	queueTranscode,
	recoverJobs,
	saveMovie,
	type Database,
	type Job,
} from '@workspace/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createJobLoop, type JobHandler } from '../src/job-loop';

const eventually = async (check: () => void) => {
	const deadline = Date.now() + 5_000;
	for (;;) {
		try {
			return check();
		} catch (error) {
			if (Date.now() > deadline) {
				throw error;
			}
		}
		await sleep(10);
	}
};

describe('the job loop', () => {
	let folder: string;
	let db: Database;
	let stop: (() => Promise<void>) | undefined;

	const addJobs = (count: number) => {
		for (let tmdbId = 1; tmdbId <= count; tmdbId++) {
			const metadata = { details: { id: tmdbId, title: `Title ${tmdbId}` } } as unknown as MovieMetadata;
			const movie = saveMovie(db, { tmdbId, path: `movies/${tmdbId}`, metadata });
			queueTranscode(db, movie.id, { userId: 1, video: 'video.mp4', output: `cache/${tmdbId}` });
		}
	};

	const logger = { info: vi.fn(), error: vi.fn() };
	const onTurn = vi.fn();

	const start = (handler: JobHandler, concurrency = 1) => {
		const notUsed = () => Promise.reject(new Error('These tests queue only transcodes.'));
		const handlers = { transcode: handler, scan: notUsed, backup: notUsed };
		const loop = createJobLoop(db, handlers, concurrency, { logger, onTurn });
		stop = loop.stop;
		loop.start();
	};

	const statuses = () => listMovies(db).map(({ transcodeStatus }) => transcodeStatus);

	beforeEach(async () => {
		vi.clearAllMocks();
		folder = await mkdtemp(path.join(tmpdir(), 'show-stream-worker-test-'));
		db = openDatabase(path.join(folder, 'app.db'));
		migrateDatabase(db);
	});

	afterEach(async () => {
		await stop?.();
		closeDatabase(db);
		await rm(folder, { recursive: true, force: true });
	});

	it('runs a job and marks it done', async () => {
		addJobs(1);

		start(async () => {});

		await eventually(() => expect(statuses()).toEqual(['ready']));
	});

	it('marks a job that rejects as failed, with the reason, and carries on', async () => {
		addJobs(2);

		start(async (job) => {
			if (job.payload.output === 'cache/1') {
				throw new Error('Bad file');
			}
		});

		await eventually(() => expect(statuses()).toEqual(['failed', 'ready']));
		expect(findMovie(db, 1)?.transcodeError).toBe('Bad file');
	});

	it('logs the id and type of each job', async () => {
		addJobs(2);

		start(async (job) => {
			if (job.payload.output === 'cache/1') {
				throw new Error('Bad file');
			}
		});

		await eventually(() => expect(statuses()).toEqual(['failed', 'ready']));
		expect(logger.info).toHaveBeenCalledWith('Started job', { jobId: 1, jobType: 'transcode', attempt: 1 });
		expect(logger.error).toHaveBeenCalledWith('Failed job', { jobId: 1, jobType: 'transcode', reason: 'Bad file' });
		expect(logger.info).toHaveBeenCalledWith('Finished job', { jobId: 2, jobType: 'transcode' });
	});

	it('reports each turn, while a long job runs too', async () => {
		addJobs(1);
		let finishJob = () => {};

		start(() => new Promise<void>((resolve) => (finishJob = resolve)));
		await eventually(() => expect(statuses()).toEqual(['in progress']));
		onTurn.mockClear();

		await eventually(() => expect(onTurn).toHaveBeenCalled());
		finishJob();
	});

	it('reports no turn while it cannot read the queue', async () => {
		start(async () => {});
		await eventually(() => expect(onTurn).toHaveBeenCalled());

		closeDatabase(db);
		await eventually(() => expect(logger.error).toHaveBeenCalled());
		onTurn.mockClear();
		await sleep(600);

		expect(onTurn).not.toHaveBeenCalled();
		await stop?.();
		stop = undefined;
		db = openDatabase(path.join(folder, 'app.db'));
	});

	it('finds a job queued after it started', async () => {
		start(async () => {});

		addJobs(1);

		await eventually(() => expect(statuses()).toEqual(['ready']));
	});

	it.each([
		[1, 4],
		[3, 4],
	])('never runs more than %i at once', async (concurrency, jobCount) => {
		addJobs(jobCount);
		let running = 0;
		let most = 0;

		start(async () => {
			running += 1;
			most = Math.max(most, running);
			await sleep(20);
			running -= 1;
		}, concurrency);

		await eventually(() => expect(statuses()).toEqual(Array(jobCount).fill('ready')));
		expect(most).toBe(concurrency);
	});

	it('stops a running job on shutdown, and returns it to the queue', async () => {
		addJobs(2);
		const started: Job[] = [];

		start((job, signal) => {
			started.push(job);
			return new Promise((_resolve, reject) => {
				signal.addEventListener('abort', () => reject(signal.reason));
			});
		});
		await eventually(() => expect(started).toHaveLength(1));

		await stop?.();

		expect(started).toHaveLength(1);
		expect(statuses()).toEqual(['in progress', 'in progress']);
		expect(recoverJobs(db, 3)).toEqual([]);
	});

	it('lets a job that finishes during shutdown stay done', async () => {
		addJobs(1);
		const started: Job[] = [];

		start(async (job, signal) => {
			started.push(job);
			await new Promise((resolve) => signal.addEventListener('abort', resolve));
		});
		await eventually(() => expect(started).toHaveLength(1));

		await stop?.();

		expect(statuses()).toEqual(['ready']);
	});
});
