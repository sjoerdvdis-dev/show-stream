import { claimNextJob, failJob, finishJob, requeueJob, type Database, type Job } from '@workspace/db';
import type { Logger } from '@workspace/logger';

const pollIntervalMs = 250;

/** A handler rejects to fail its job. It stops work when `signal` aborts, and then rejects. */
export type JobHandler = (job: Job, signal: AbortSignal) => Promise<void>;

/** One handler per job type. The compiler rejects a missing one. */
export type JobHandlers = Record<Job['type'], JobHandler>;

export type JobLoopOptions = {
	logger: Pick<Logger, 'info' | 'error'>;
	/** Called after each turn in which the queue could be read, so never by a loop that is stuck. */
	onTurn: () => void;
};

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

const fieldsOf = (job: Job) => ({ jobId: job.id, jobType: job.type });

/**
 * Runs queued jobs, up to `concurrency` at a time. Every job it claims ends as done or failed,
 * unless `stop` interrupts it, which puts it back in the queue.
 */
export const createJobLoop = (
	db: Database,
	handlers: JobHandlers,
	concurrency: number,
	{ logger, onTurn }: JobLoopOptions,
) => {
	const running = new Set<Promise<void>>();
	const stopping = new AbortController();
	let timer: NodeJS.Timeout | undefined;

	const run = async (job: Job) => {
		logger.info('Started job', { ...fieldsOf(job), attempt: job.attempts });
		try {
			await handlers[job.type](job, stopping.signal);
			finishJob(db, job.id);
			logger.info('Finished job', fieldsOf(job));
		} catch (error) {
			if (stopping.signal.aborted) {
				requeueJob(db, job.id);
				logger.info('Requeued job for the next start', fieldsOf(job));
			} else {
				failJob(db, job.id, reasonOf(error));
				logger.error('Failed job', { ...fieldsOf(job), reason: reasonOf(error) });
			}
		}
	};

	const claimJobs = () => {
		while (running.size < concurrency) {
			const job = claimNextJob(db);
			if (!job) {
				return;
			}
			const jobRun: Promise<void> = run(job)
				// A job left `running` here is recovered at the next start.
				.catch((error) => {
					logger.error('Could not record the end of a job', { ...fieldsOf(job), error });
				})
				.finally(() => running.delete(jobRun));
			running.add(jobRun);
		}
	};

	const tick = () => {
		try {
			claimJobs();
			onTurn();
		} catch (error) {
			// Most likely a busy database, and the next tick can try again.
			logger.error('A turn of the job loop failed', { error });
		}
	};

	return {
		start: () => {
			tick();
			timer = setInterval(tick, pollIntervalMs);
		},
		/** Stops claiming, then interrupts running jobs and waits for them to go back in the queue. */
		stop: async () => {
			clearInterval(timer);
			stopping.abort(new Error('The worker is shutting down.'));
			await Promise.all(running);
		},
	};
};
