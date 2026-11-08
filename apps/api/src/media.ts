import path from 'path';
import fs from 'fs';
import { db } from './db';
import { ApiFailure, notFound } from './errors';
import { findLatestScan, findLibraryMovie, findStoredImage, libraryFacets, listLibrary, queueScan, type Job } from '@workspace/db';
import type { ImageKind, LibraryFacets, LibraryMovie, LibraryPage, LibraryQuery } from '@workspace/contract/library';
import type { Response } from 'express';
import { config } from './config';
import { sendFile } from './send-file';
import type { Scan, ScanAPIData, ScanCounts } from '@workspace/contract/api-types';

/**
 * Media API
 * - requests for media information
 */

// GET /library/movies
// -> one page of movies, searched, filtered and sorted
export const getLibraryMovies = async (query: LibraryQuery): Promise<LibraryPage> => ({
	...listLibrary(db, 'movie', query),
	page: query.page,
	pageSize: query.pageSize,
});

// GET /library/movies/facets
// -> what the movie filters can offer
export const getLibraryMovieFacets = async (): Promise<LibraryFacets> => libraryFacets(db, 'movie');

/**
 * A scan never replaces art it has stored, so browsers can keep an image for a month and then
 * check its ETag. `private`, because images need a session.
 */
const imageCacheControl = 'private, max-age=2592000';

// GET /library/movies/:id
// -> one movie's page
export const getLibraryMovie = async (id: number): Promise<LibraryMovie> => {
	const movie = findLibraryMovie(db, id);
	if (!movie) {
		throw notFound('Movie');
	}
	return movie;
};

// GET /library/movies/:id/images/:kind
// -> the stored poster or backdrop of a movie
export const sendMovieImage = async ({ id, kind, res }: { id: number; kind: ImageKind; res: Response }) => {
	// Built from the title and the kind alone, so no part of the path comes from the request.
	const file = findStoredImage(db, 'movie', id, kind);
	if (!file) {
		throw notFound('Image');
	}

	await sendFile(
		res,
		file,
		// Headers given here are only sent with the file, so a 404 is never cached.
		{ root: config.mediaFolder, cacheControl: false, headers: { 'Cache-Control': imageCacheControl } },
		'Image',
	);
};

/**
 * Media Scan
 * The worker runs scans. The API queues them and reads what they found.
 */

const noCounts: ScanCounts = { found: 0, added: 0, updated: 0, unmatched: 0, failed: 0 };

const toScan = ({ status, error, payload: { requestedAt, scanResult } }: Job): Scan => ({
	status,
	// `queueScan` always sets `requestedAt`.
	time: scanResult?.finishedAt ?? requestedAt!,
	counts: scanResult?.counts ?? noCounts,
	...(error ? { error } : {}),
	errors: scanResult?.errors ?? [],
});

// POST /scan
export const startScan = async (): Promise<ScanAPIData> => {
	const job = queueScan(db, new Date());
	if (!job) {
		throw new ApiFailure('conflict', 'A scan is already queued or running');
	}
	return { scan: toScan(job) };
};

// GET /scan
// -> the latest scan
export const getScan = async (): Promise<ScanAPIData> => {
	const job = findLatestScan(db);
	return { scan: job ? toScan(job) : null };
};

/**
 * Utility functions to find media/videos
 */

const acceptedVideoExtensions = ['.mp4'];
export const findMediaVideoPath = async (mediaPath: string): Promise<string | null> => {
	const videoFiles = fs.readdirSync(mediaPath);
	const videoFile = videoFiles.find((file) => {
		return acceptedVideoExtensions.includes(path.extname(file));
	});
	return videoFile ? path.resolve(mediaPath, videoFile) : null;
};
