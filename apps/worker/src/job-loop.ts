import { claimNextJob, failJob, finishJob, requeueJob, type Database, type Job } from '@workspace/db';

const pollIntervalMs = 250;

/** A handler rejects to fail its job. It stops work when `signal` aborts, and then rejects. */
export type JobHandler = (job: Job, signal: AbortSignal) => Promise<void>;

/** One handler per job type. The compiler rejects a missing one. */
export type JobHandlers = Record<Job['type'], JobHandler>;

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Runs queued jobs, up to `concurrency` at a time. Every job it claims ends as done or failed,
 * unless `stop` interrupts it, which puts it back in the queue.
 */
export const createJobLoop = (db: Database, handlers: JobHandlers, concurrency: number) => {
	const running = new Set<Promise<void>>();
	const stopping = new AbortController();
	let timer: NodeJS.Timeout | undefined;

	const run = async (job: Job) => {
		console.log(`Started ${job.type} job ${job.id}, attempt ${job.attempts}`);
		try {
			await handlers[job.type](job, stopping.signal);
			finishJob(db, job.id);
			console.log(`Finished ${job.type} job ${job.id}`);
		} catch (error) {
			if (stopping.signal.aborted) {
				requeueJob(db, job.id);
				console.log(`Requeued ${job.type} job ${job.id} for the next start`);
			} else {
				failJob(db, job.id, reasonOf(error));
				console.error(`Failed ${job.type} job ${job.id}: ${reasonOf(error)}`);
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
				.catch((error) => console.error(`Could not record the end of job ${job.id}:`, error))
				.finally(() => running.delete(jobRun));
			running.add(jobRun);
		}
	};

	const tick = () => {
		try {
			claimJobs();
		} catch (error) {
			// Most likely a busy database, and the next tick can try again.
			console.error('Could not claim a job:', error);
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
