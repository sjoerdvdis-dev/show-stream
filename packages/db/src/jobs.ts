import { and, eq } from 'drizzle-orm';
import type { TranscodeStatus } from '@workspace/contract/api-types';
import type { Database } from './connection.js';
import { jobs, type JobPayload } from './schema.js';

/** Sets the state of a title's transcode job, and creates the job on first use. */
export const setTranscodeStatus = (db: Database, mediaId: number, status: TranscodeStatus): void => {
	db.insert(jobs)
		.values({ type: 'transcode', mediaId, status })
		.onConflictDoUpdate({ target: [jobs.type, jobs.mediaId], set: { status } })
		.run();
};

/** Does nothing for a title with no transcode job. */
const changePayload = (db: Database, mediaId: number, change: (payload: JobPayload) => JobPayload): void => {
	const transcodeJob = and(eq(jobs.type, 'transcode'), eq(jobs.mediaId, mediaId));
	db.transaction((tx) => {
		const job = tx.select({ payload: jobs.payload }).from(jobs).where(transcodeJob).get();
		if (job) {
			tx.update(jobs)
				.set({ payload: change(job.payload) })
				.where(transcodeJob)
				.run();
		}
	});
};

export const recordPlaylistRequest = (db: Database, mediaId: number, date: Date): void => {
	changePayload(db, mediaId, (payload) => ({ ...payload, lastRequestDate: date.toISOString() }));
};

/** Adds a user to those told when the title's running transcode is ready. */
export const addTranscodeRequester = (db: Database, mediaId: number, userId: number): void => {
	changePayload(db, mediaId, (payload) => ({
		...payload,
		requestedBy: [...new Set([...(payload.requestedBy ?? []), userId])],
	}));
};

/** Returns the users waiting on a title's transcode, and clears the list. */
export const takeTranscodeRequesters = (db: Database, mediaId: number): number[] => {
	let requesters: number[] = [];
	changePayload(db, mediaId, ({ requestedBy = [], ...payload }) => {
		requesters = requestedBy;
		return payload;
	});
	return requesters;
};
