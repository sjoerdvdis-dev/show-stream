// Video API

import fs from 'fs';
import path from 'path';
import { config } from './config';
import { ApiFailure, notFound } from './errors';
import { findMediaVideoPath } from './media';
import { notifyUsers } from './notification';
import { sendFile } from './send-file';
import { db } from './db';
import {
	addTranscodeRequester,
	findMovie,
	markTranscodeDone,
	queueTranscode,
	recordPlaylistRequest,
	retryTranscode,
	takeFinishedTranscodes,
	type FinishedTranscode,
	type Movie,
} from '@workspace/db';
import type { Response } from 'express';
import type { Logger } from '@workspace/logger';
import type {
	APINotification,
	TranscodePlaylistAPIData,
	TranscodeRequestAPIData,
} from '@workspace/contract/api-types';

/**
 * Video API
 * - Queueing transcodes, which the worker runs
 * - Streaming
 */

/** What a job needs to know. Paths are relative, so that the worker can mount the media elsewhere. */
const describeTranscode = async (movie: Movie, tmdbId: number) => {
	const videoPath = await findMediaVideoPath(path.resolve(config.mediaFolder, movie.path));

	if (!videoPath) {
		throw notFound('Video');
	}

	return { video: path.relative(config.mediaFolder, videoPath), output: path.join(cacheFolder, String(tmdbId)) };
};

/** ffmpeg writes the end marker last, so a playlist without it is from an interrupted run. */
const hasCompletePlaylist = (id: number) => {
	const playlistPath = path.resolve(getCachePath(id), 'playlist.m3u8');
	return fs.existsSync(playlistPath) && fs.readFileSync(playlistPath, 'utf8').trimEnd().endsWith('#EXT-X-ENDLIST');
};

/**
 * /transcode/request/:id
 * A failed title stays failed, so that loading a page does not repeat a failure.
 */
export const transcodeRequest = async (params: {
	id: number;
	userId: number;
	logger: Logger;
}): Promise<TranscodeRequestAPIData> => {
	const { id, userId, logger } = params;

	const movie = findMovie(db, id);

	if (!movie) {
		throw notFound('Movie');
	}

	const { transcodeStatus: status, transcodeError: error } = movie;

	if (status === 'failed') {
		return { status, ...(error ? { error } : {}) };
	}

	if (status === 'in progress') {
		addTranscodeRequester(db, movie.id, userId);
	}

	if (status !== 'not ready') {
		return { status };
	}

	const transcode = await describeTranscode(movie, id);

	if (hasCompletePlaylist(id)) {
		logger.log('info', `Found cached transcoding for video ${id}`);
		markTranscodeDone(db, movie.id);
		return { status: 'ready' };
	}

	queueTranscode(db, movie.id, { userId, ...transcode });
	return { status: 'in progress' };
};

/**
 * /transcode/retry/:id
 * Looks for the video again, because the fix for a failure may be a new file.
 */
export const transcodeRetry = async (params: { id: number; userId: number }): Promise<TranscodeRequestAPIData> => {
	const { id, userId } = params;

	const movie = findMovie(db, id);

	if (!movie) {
		throw notFound('Movie');
	}

	if (movie.transcodeStatus === 'in progress') {
		// Someone else retried first, and this user wants to hear the result too.
		addTranscodeRequester(db, movie.id, userId);
		return { status: 'in progress' };
	}

	if (movie.transcodeStatus !== 'failed') {
		throw new ApiFailure('conflict', 'Only a failed transcode can be retried');
	}

	const transcode = await describeTranscode(movie, id);

	if (!retryTranscode(db, movie.id, { userId, ...transcode })) {
		throw new ApiFailure('conflict', 'Only a failed transcode can be retried');
	}

	return { status: 'in progress' };
};

const toNotification = (transcode: FinishedTranscode): APINotification =>
	transcode.status === 'done'
		? { type: 'transcode:ready', data: { id: transcode.tmdbId, title: transcode.title } }
		: { type: 'transcode:failed', data: { id: transcode.tmdbId, title: transcode.title, error: transcode.error } };

/**
 * The worker cannot reach sockets, so the API looks for what it has finished. This keeps
 * SQLite as the only link between the two.
 */
export const announceFinishedTranscodes = () => {
	for (const transcode of takeFinishedTranscodes(db)) {
		notifyUsers(transcode.requestedBy, toNotification(transcode));
	}
};

/**
 * /transcode/playlist/:id
 */
export const transcodePlaylist = async (params: {
	id: number;
	logger: Logger;
}): Promise<TranscodePlaylistAPIData> => {
	const { id } = params;
	const movie = findMovie(db, id);

	if (movie?.transcodeStatus !== 'ready') {
		throw notFound('Transcoding');
	}

	recordPlaylistRequest(db, movie.id, new Date());

	return { playlistUrl: `${getStreamPath(id)}/playlist.m3u8` };
};

/*
 * /streams/:id/:file
 * -> static serve of transcoded video files
 */
export const streamVideoFile = async (params: { id: number; file: string; res: Response }) => {
	const { id, file, res } = params;

	if (findMovie(db, id)?.transcodeStatus !== 'ready') {
		throw notFound('Stream');
	}

	// `root` limits the file to the cache.
	await sendFile(res, file, { root: getCachePath(id) }, 'Stream');
};

/**
 * Utility functions
 */

const cacheFolder = 'cache';

const getCachePath = (id: number): string => {
	return path.resolve(config.mediaFolder, cacheFolder, String(id));
};

const getStreamPath = (id: number): string => {
	return `/streams/${id}`;
};
