import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { Database } from './connection.js';
import { jobs, media, type Job, type JobPayload } from './schema.js';

/**
 * The job queue. SQLite is the only link between the API and the worker, so these functions
 * are all either one statement or an `immediate` transaction. A deferred transaction that
 * reads before it writes fails at once if the other process wrote in between.
 */

const transcodeJob = (mediaId: number) => and(eq(jobs.type, 'transcode'), eq(jobs.mediaId, mediaId));

/** Does nothing for a title with no transcode job. */
const changePayload = (db: Database, mediaId: number, change: (payload: JobPayload) => JobPayload): void => {
	db.transaction(
		(tx) => {
			const job = tx.select({ payload: jobs.payload }).from(jobs).where(transcodeJob(mediaId)).get();
			if (job) {
				tx.update(jobs)
					.set({ payload: change(job.payload) })
					.where(transcodeJob(mediaId))
					.run();
			}
		},
		{ behavior: 'immediate' },
	);
};

export const recordPlaylistRequest = (db: Database, mediaId: number, date: Date): void => {
	changePayload(db, mediaId, (payload) => ({ ...payload, lastRequestDate: date.toISOString() }));
};

/** Adds a user to those told when the title's transcode finishes. */
export const addTranscodeRequester = (db: Database, mediaId: number, userId: number): void => {
	changePayload(db, mediaId, (payload) => ({
		...payload,
		requestedBy: [...new Set([...(payload.requestedBy ?? []), userId])],
	}));
};

type TranscodeRequest = { userId: number; video: string; output: string };

/** Queues a transcode. If the title already has a job, the user joins those who asked for it. */
export const queueTranscode = (db: Database, mediaId: number, { userId, video, output }: TranscodeRequest): void => {
	const created = db
		.insert(jobs)
		.values({ type: 'transcode', mediaId, status: 'queued', payload: { video, output, requestedBy: [userId] } })
		.onConflictDoNothing()
		.returning({ id: jobs.id })
		.all();
	if (created.length === 0) {
		addTranscodeRequester(db, mediaId, userId);
	}
};

/** Records a transcode that needed no run, because its output already exists. Nobody is waiting on it. */
export const markTranscodeDone = (db: Database, mediaId: number): void => {
	db.insert(jobs).values({ type: 'transcode', mediaId, status: 'done', announced: true }).onConflictDoNothing().run();
};

/**
 * Puts a failed transcode back in the queue, as a new job for the user who asked.
 *
 * @returns false if the title has no failed job, which leaves its job as it was.
 */
export const retryTranscode = (db: Database, mediaId: number, { userId, video, output }: TranscodeRequest): boolean =>
	db
		.update(jobs)
		.set({
			status: 'queued',
			error: null,
			attempts: 0,
			announced: false,
			payload: sql`json_patch(${jobs.payload}, ${JSON.stringify({ video, output, requestedBy: [userId] })})`,
		})
		.where(and(transcodeJob(mediaId), eq(jobs.status, 'failed')))
		.returning({ id: jobs.id })
		.all().length > 0;

/**
 * Takes the oldest queued job for this caller, and counts a run. One statement holds the
 * write lock from start to finish, so that no two callers can take the same job.
 */
export const claimNextJob = (db: Database): Job | undefined =>
	db
		.update(jobs)
		.set({ status: 'running', attempts: sql`${jobs.attempts} + 1` })
		.where(
			eq(
				jobs.id,
				db.select({ id: jobs.id }).from(jobs).where(eq(jobs.status, 'queued')).orderBy(asc(jobs.id)).limit(1),
			),
		)
		.returning()
		.all()[0];

export const finishJob = (db: Database, id: number): void => {
	db.update(jobs).set({ status: 'done', error: null }).where(eq(jobs.id, id)).run();
};

export const failJob = (db: Database, id: number, error: string): void => {
	db.update(jobs).set({ status: 'failed', error }).where(eq(jobs.id, id)).run();
};

/** Returns a running job to the queue after a clean shutdown, which does not count as a run. */
export const requeueJob = (db: Database, id: number): void => {
	db.update(jobs)
		.set({ status: 'queued', attempts: sql`${jobs.attempts} - 1` })
		.where(eq(jobs.id, id))
		.run();
};

/**
 * For the worker's startup, when any `running` job belongs to a dead process. It goes back in
 * the queue unless it has had `maxAttempts` runs, in case the job itself is what kills the worker.
 *
 * @returns The jobs that were interrupted, as they stood when their last run ended.
 */
export const recoverJobs = (db: Database, maxAttempts: number): Job[] =>
	db.transaction(
		(tx) => {
			const interrupted = tx.select().from(jobs).where(eq(jobs.status, 'running')).all();
			for (const { id, attempts } of interrupted) {
				const gaveUp = attempts >= maxAttempts;
				tx.update(jobs)
					.set(
						gaveUp
							? { status: 'failed', error: `The worker stopped during all ${attempts} attempts at this job.` }
							: { status: 'queued' },
					)
					.where(eq(jobs.id, id))
					.run();
			}
			return interrupted;
		},
		{ behavior: 'immediate' },
	);

export type FinishedTranscode = { title: string; requestedBy: number[] } & (
	| { status: 'done' }
	| { status: 'failed'; error: string }
);

/** Returns the transcodes that finished since the last call. Each one is returned only once. */
export const takeFinishedTranscodes = (db: Database): FinishedTranscode[] =>
	db.transaction(
		(tx) => {
			const finished = tx
				.select({
					id: jobs.id,
					status: jobs.status,
					error: jobs.error,
					payload: jobs.payload,
					title: media.title,
				})
				.from(jobs)
				.innerJoin(media, eq(media.id, jobs.mediaId))
				.where(and(inArray(jobs.status, ['done', 'failed']), eq(jobs.announced, false)))
				.all();

			if (finished.length > 0) {
				tx.update(jobs)
					.set({ announced: true })
					.where(
						inArray(
							jobs.id,
							finished.map(({ id }) => id),
						),
					)
					.run();
			}

			return finished.map(({ status, error, title, payload }) => {
				const requestedBy = payload.requestedBy ?? [];
				return status === 'failed'
					? { status, error: error ?? 'The job failed.', title, requestedBy }
					: { status: 'done' as const, title, requestedBy };
			});
		},
		{ behavior: 'immediate' },
	);
