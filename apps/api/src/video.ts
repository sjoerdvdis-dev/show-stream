// Video API

import fs from 'fs';
import path from 'path';
import ffmpeg, { ffprobe } from 'fluent-ffmpeg';
import { findTranscodeMediaInfo, findMediaVideoPath } from './media';
import { sendNotificationToClients } from './notification';
import { ensureDbConnection, TranscodeModel } from './db';
import type { Response, Request } from 'express';
import type { Logger } from 'winston';
import type { BaseAPIResponse, TranscodePlaylistAPIData, TranscodeRequestAPIData } from '@workspace/types/api-types';
import type { TranscodeDocument } from '@workspace/types/db-types';

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
}): Promise<BaseAPIResponse & { data?: TranscodeRequestAPIData }> => {
	const { id, logger } = params;

	const transcoding = await getTranscoding(id);
	const status = transcoding?.status || 'not ready';

	if (['ready', 'in progress'].includes(status)) {
		return { status: 200, data: { status } };
	}

	const { path: mediaPath, title: mediaTitle } = (await findTranscodeMediaInfo(id)) || {};

	if (!mediaPath) {
		return { status: 400, error: 'Media not found', data: { status: 'not ready' } };
	}

	const mediaResolvedPath = path.resolve(__dirname, '../media', mediaPath);
	const videoPath = await findMediaVideoPath(mediaResolvedPath);

	if (!videoPath) {
		return { status: 400, error: 'Video not found', data: { status: 'not ready' } };
	}

	const cachePath = getCachePath(id);
	const playlistPath = path.resolve(cachePath, 'playlist.m3u8');
	const segmentPath = path.resolve(cachePath, 'segment%03d.ts');

	if (fs.existsSync(playlistPath)) {
		logger.log('info', `Found cached transcoding for video ${id}`);
		setTranscoding(id, { status: 'ready' });
		return { status: 200, data: { status: 'ready' } };
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
				`-hls_segment_filename ${segmentPath}`,
				'-f hls',
			])
			.on('start', () => {
				setTranscoding(id, { status: 'in progress' });
				resolve({ status: 200, data: { status: 'in progress' } });
			})
			.on('end', () => {
				// TEMP delay
				setTimeout(() => {
					setTranscoding(id, { status: 'ready' });
					sendNotificationToClients({ type: 'transcode:ready', data: { title: mediaTitle || String(id) } });
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
}): Promise<BaseAPIResponse & { data?: TranscodePlaylistAPIData }> => {
	const { id } = params;
	const transcoding = await getTranscoding(id);

	if (transcoding?.status !== 'ready') {
		return { status: 404, error: 'Transcoding not found' };
	}

	setTranscoding(id, { lastRequestDate: new Date() });

	return { status: 200, data: { playlistUrl: `${getStreamPath(id)}/playlist.m3u8` } };
};

/*
 * /streams/:id/:file
 * -> static serve of transcoded video files
 */
const acceptedVideoFiles = ['.m3u8', '.ts'];
export const streamVideoFile = async (params: {
	id: number;
	file: string;
	logger: Logger;
	req: Request;
	res: Response;
}) => {
	const { id, file, logger, res } = params;
	const transcoding = await getTranscoding(id);

	if (
		!acceptedVideoFiles.includes(path.extname(file)) ||
		!validPath(file) ||
		!validPath(String(id)) ||
		transcoding?.status !== 'ready'
	) {
		logger.log('security', `Invalid video file request: ${id}/${file}`);
		res.status(400).send('Invalid video file');
		return;
	}

	const filePath = path.resolve(getCachePath(id), file);
	res.sendFile(filePath);
};

/**
 * Utility functions
 */

// Check if path is valid
const validPath = (path: string): boolean => {
	return !(path.includes('..') || path.includes('/') || path.includes('\\'));
};

const cachedTranscodings: Record<number, TranscodeDocument> = {};

export const getTranscoding = async (id: number): Promise<TranscodeDocument | null> => {
	if (cachedTranscodings[id]) {
		return cachedTranscodings[id];
	}

	if (!ensureDbConnection()) {
		return null;
	}

	const transcoding = await TranscodeModel.findOne({ id }).lean();

	if (transcoding) {
		cachedTranscodings[id] = transcoding;
	}

	return transcoding;
};

export const setTranscoding = async (id: number, update: Partial<TranscodeDocument>): Promise<boolean> => {
	if (cachedTranscodings[id]) {
		cachedTranscodings[id] = { ...cachedTranscodings[id], ...update };
	}

	if (!ensureDbConnection()) {
		return false;
	}

	const exists = await TranscodeModel.exists({ id });
	if (!exists) {
		await TranscodeModel.create({ id, ...update });
	} else {
		await TranscodeModel.updateOne({ id }, { $set: update });
	}

	return true;
};

const getCachePath = (id: number): string => {
	return path.resolve(__dirname, `../media/cache/${id}`);
};

const getStreamPath = (id: number): string => {
	return `/streams/${id}`;
};
