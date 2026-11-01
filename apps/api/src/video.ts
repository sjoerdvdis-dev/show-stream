// Video API

import fs from 'fs';
import path from 'path';
import ffmpeg, { ffprobe } from 'fluent-ffmpeg';
import { config } from './config';
import { notFound } from './errors';
import { findMediaVideoPath } from './media';
import { sendNotificationToClients } from './notification';
import { db } from './db';
import { findMovie, recordPlaylistRequest, setTranscodeStatus } from '@workspace/db';
import type { Response } from 'express';
import type { Logger } from 'winston';
import type { TranscodePlaylistAPIData, TranscodeRequestAPIData } from '@workspace/contract/api-types';

/**
 * Video API
 * - Transcoding
 * - Streaming
 */

/**
 * /transcode/request/:id
 */
export const transcodeRequest = async (params: {
	id: number;
	logger: Logger;
}): Promise<TranscodeRequestAPIData> => {
	const { id, logger } = params;

	const movie = findMovie(db, id);

	if (!movie) {
		throw notFound('Movie');
	}

	const { transcodeStatus: status } = movie;

	if (['ready', 'in progress'].includes(status)) {
		return { status };
	}

	const mediaResolvedPath = path.resolve(config.mediaFolder, movie.path);
	const videoPath = await findMediaVideoPath(mediaResolvedPath);

	if (!videoPath) {
		throw notFound('Video');
	}

	const cachePath = getCachePath(id);
	const playlistPath = path.resolve(cachePath, 'playlist.m3u8');
	const segmentPath = path.resolve(cachePath, 'segment%03d.ts');

	if (fs.existsSync(playlistPath)) {
		logger.log('info', `Found cached transcoding for video ${id}`);
		setTranscodeStatus(db, movie.id, 'ready');
		return { status: 'ready' };
	}

	// Create transcoding

	if (!fs.existsSync(cachePath)) {
		fs.mkdirSync(cachePath, { recursive: true });
	}

	// Convert to HSL Format
	// TODO:
	// - Update ffmpeg
	// - 480p 720p 1080p
	// - Encode using libx264
	// - Encode using libx264

	return await new Promise((resolve) => {
		ffmpeg()
			.input(videoPath)
			.output(playlistPath)
			.outputOptions([
				'-c copy',
				'-hls_time 6',
				'-hls_playlist_type vod',
				'-hls_list_size 0',
				'-hls_flags independent_segments',
				'-hls_segment_type mpegts',
				'-f hls',
			])
			// Two arguments, because fluent-ffmpeg splits a single string at a space in the path.
			.outputOptions('-hls_segment_filename', segmentPath)
			.on('start', () => {
				setTranscodeStatus(db, movie.id, 'in progress');
				resolve({ status: 'in progress' });
			})
			.on('end', () => {
				// TEMP delay
				setTimeout(() => {
					setTranscodeStatus(db, movie.id, 'ready');
					sendNotificationToClients({ type: 'transcode:ready', data: { title: movie.title } });
				}, 10000);
			})
			.run();
	});
};

/*
 * /streams/:id/:file
 * -> static serve of transcoded video files
 * -> static serve of transcoded video files
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

	await new Promise<void>((resolve, reject) => {
		// `root` limits the file to the cache, and limits the check for dot folders to `file`.
		res.sendFile(file, { root: getCachePath(id) }, (error: (Error & { code?: string; status?: number }) | undefined) => {
			if (!error || error.code === 'ECONNABORTED') {
				// Players drop segments they no longer need, which is not a failure.
				resolve();
			} else if (error.status === 404) {
				reject(notFound('Stream'));
			} else {
				reject(error);
			}
		});
	});
};

/**
 * Utility functions
 */

const getCachePath = (id: number): string => {
	return path.resolve(config.mediaFolder, 'cache', String(id));
};

const getStreamPath = (id: number): string => {
	return `/streams/${id}`;
};
