import { mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import type { Job } from '@workspace/db';
import { runFfmpeg } from './ffmpeg';

const hlsArguments = (input: string, folder: string) => [
	'-i',
	input,
	'-y',
	'-c',
	'copy',
	'-hls_time',
	'6',
	'-hls_playlist_type',
	'vod',
	'-hls_list_size',
	'0',
	'-hls_flags',
	'independent_segments',
	'-hls_segment_type',
	'mpegts',
	'-f',
	'hls',
	'-hls_segment_filename',
	path.join(folder, 'segment%03d.ts'),
	path.join(folder, 'playlist.m3u8'),
];

/**
 * Where a run writes until it succeeds. It sits beside the cache folder, so that the final
 * rename stays on one disk, and each run has its own, so that a run can never meet another's
 * output. The API serves only folders with a numeric name, so this is never streamed.
 */
const partialFolder = (mediaFolder: string, job: Job) =>
	`${path.resolve(mediaFolder, job.payload.output ?? '')}.partial-${job.attempts}`;

const removeFolder = (folder: string) => rm(folder, { recursive: true, force: true, maxRetries: 5 });

/** Removes what a run left behind when its worker died. */
export const removePartialOutput = (mediaFolder: string, job: Job) =>
	job.payload.output ? removeFolder(partialFolder(mediaFolder, job)) : Promise.resolve();

/**
 * Converts a title to HLS. The output moves into the cache only after ffmpeg has succeeded,
 * so that a playlist in the cache is always complete.
 */
export const transcode = async (mediaFolder: string, job: Job, signal: AbortSignal) => {
	const { video, output } = job.payload;
	if (!video || !output) {
		throw new Error('The job does not say what to transcode.');
	}

	const partial = partialFolder(mediaFolder, job);
	const finalFolder = path.resolve(mediaFolder, output);

	try {
		await removeFolder(partial);
		await mkdir(partial, { recursive: true });
		await runFfmpeg(hlsArguments(path.resolve(mediaFolder, video), partial), { signal });
		// An older version's interrupted run, or a worker that died right after this rename.
		await removeFolder(finalFolder);
		await rename(partial, finalFolder);
	} catch (error) {
		await removeFolder(partial);
		// Reasons reach every user who asked, and they need no paths from this machine.
		throw error instanceof Error ? new Error(error.message.replaceAll(`${mediaFolder}${path.sep}`, '')) : error;
	}
};
