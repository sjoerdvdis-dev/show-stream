import path from 'path';
import fs from 'fs';
import { db } from './db';
import { ApiFailure, notFound } from './errors';
import { findLatestScan, findMovie, libraryFacets, listLibrary, listMovies, listShows, queueScan, type Job, type Movie } from '@workspace/db';
import type { LibraryFacets, LibraryPage, LibraryQuery } from '@workspace/contract/library';
import type {
	MovieAPIData,
	MovieMetadata,
	MoviesAPIData,
	Scan,
	ScanAPIData,
	ScanCounts,
	ShowsAPIData,
} from '@workspace/contract/api-types';

/**
 * Media API
 * - requests for media information
 */

const toMovieMetadata = ({ metadata, transcodeStatus, transcodeError }: Movie): MovieMetadata => ({
	...metadata,
	transcodeStatus,
	...(transcodeError ? { transcodeError } : {}),
});

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

// /movies
// -> metadata of all movies
export const getMovies = async (): Promise<MoviesAPIData> => {
	const movies = listMovies(db).map((movie) => toMovieMetadata(movie));
	return { movies };
};

// /movies/:id
// -> metadata of a specific movie
export const getMovie = async (params: { id: number }): Promise<MovieAPIData> => {
	const movie = findMovie(db, params.id);
	if (!movie) {
		throw notFound('Movie');
	}
	return { metadata: toMovieMetadata(movie) };
};

// /shows
// -> metadata of all shows
export const getShows = async (): Promise<ShowsAPIData> => {
	return { shows: listShows(db).map((show) => show.metadata) };
};

// /shows/:id
// -> metadata of a specific show
// 

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
