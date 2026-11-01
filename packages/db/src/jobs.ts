import { and, eq } from 'drizzle-orm';
import type { TranscodeStatus } from '@workspace/contract/api-types';
import type { Database } from './connection.js';
import { jobs } from './schema.js';

/** Sets the state of a title's transcode job, and creates the job on first use. */
export const setTranscodeStatus = (db: Database, mediaId: number, status: TranscodeStatus): void => {
	db.insert(jobs)
		.values({ type: 'transcode', mediaId, status })
		.onConflictDoUpdate({ target: [jobs.type, jobs.mediaId], set: { status } })
		.run();
};

/** Does nothing for a title with no transcode job. */
export const recordPlaylistRequest = (db: Database, mediaId: number, date: Date): void => {
	db.update(jobs)
		.set({ payload: { lastRequestDate: date.toISOString() } })
		.where(and(eq(jobs.type, 'transcode'), eq(jobs.mediaId, mediaId)))
		.run();
};
