import path from 'path';
import fs from 'fs';
import { config } from './config';
import { db } from './db';
import { notFound } from './errors';
import { findMovie, listMovies, listShows, saveMovie, setSetting } from '@workspace/db';
import { TMDB } from 'tmdb-ts';
import type { MovieDetails, TvShowDetails } from 'tmdb-ts';
import type { Logger } from 'winston';
import type {
	MovieAPIData,
	MovieMetadata,
	MoviesAPIData,
	ShowsAPIData,
} from '@workspace/contract/api-types';

const includedCrewJobs = ['Director'];

/**
 * Media API
 * - requests for media information
 */

// /movies
// -> metadata of all movies
export const getMovies = async (): Promise<MoviesAPIData> => {
	const movies = listMovies(db).map(({ metadata, transcodeStatus }) => ({ ...metadata, transcodeStatus }));
	return { movies };
};

// /movies/:id
// -> metadata of a specific movie
export const getMovie = async (params: { id: number }): Promise<MovieAPIData> => {
	const movie = findMovie(db, params.id);
	if (!movie) {
		throw notFound('Movie');
	}
	return { metadata: { ...movie.metadata, transcodeStatus: movie.transcodeStatus } };
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
 * Creates metadata scan of Movies (later Shows) folder
 */

type IdentifiedMovie = { tmdbId: number; path: string; metadata: MovieMetadata };
const tmdb = new TMDB(config.tmdbToken);

export const mediaScan = async (mediaFolder: string, logger: Logger): Promise<void> => {
	const identifiedMovies = await movieScan(mediaFolder, logger);

	for (const movie of identifiedMovies) {
		saveMovie(db, movie);
	}

	const lastScanTime = new Date();
	setSetting(db, 'lastScanTime', lastScanTime.toISOString());

	logger.log('info', `Media scan completed at ${lastScanTime}`);
};

export const movieScan = async (mediaFolder: string, logger: Logger): Promise<IdentifiedMovie[]> => {
	const movieBaseFolder = 'movies';
	const movieFolder = path.resolve(mediaFolder, movieBaseFolder);
	const movieDirs = fs.readdirSync(movieFolder);
	const identifiedMovies: IdentifiedMovie[] = [];

	for (const movieDir of movieDirs) {
		// Format: "Movie Name (Year)"
		const movieRegex = /^(.*)\s\((\d{4})\)$/;
		const [_, movieName, movieYear] = movieDir.match(movieRegex) || [];
		const moviePath = `${movieBaseFolder}/${movieDir}`;

		if (movieName && movieYear) {
			const movieMetadata = await fetchMovieMetadata({ name: movieName, year: parseInt(movieYear) });
			if (!movieMetadata || !movieMetadata.details.id) continue;
			identifiedMovies.push({
				tmdbId: movieMetadata.details.id,
				path: moviePath,
				metadata: movieMetadata,
			});
		}
	}

	logger.log('info', `Identified ${identifiedMovies.length} movies`);
	return identifiedMovies;
};

export const showScan = async (mediaFolder: string, logger: Logger) => {
	return [];
};

const fetchMovieMetadata = async ({
	name,
	year,
}: {
	name: string;
	year: number;
}): Promise<MovieMetadata | undefined> => {
	try {
		const search = await tmdb.search.movies({ query: name, year });
		const { id } = search.results![0] || {};

		if (!id) {
			return undefined;
		}

		const details = await tmdb.movies.details(id!);
		let credits = await tmdb.movies.credits(id!);
		let images = await tmdb.movies.images(id!)

		// Filter crew jobs
		credits.crew = credits.crew.filter((crew) => includedCrewJobs.includes(crew.job));

		// Only include english images
		images.posters = images.posters.filter((poster) => poster.iso_639_1 === 'en');
		images.backdrops = images.backdrops.filter((backdrop) => backdrop.iso_639_1 === 'en');
		images.logos = images.logos.filter((logo) =>
			logo.iso_639_1 === 'en'
		);

		return {
			details,
			credits,
			images
		};
	} catch (error) {
		console.error('Error fetching movie details:', error);
	}
};

const fetchShowMetadata = async ({
	name,
	year,
}: {
	name: string;
	year: number;
}): Promise<TvShowDetails | undefined> => {
	try {
		const search = await tmdb.search.tvShows({ query: name, year });
		const { id } = search.results![0] || {};

		if (!id) {
			return undefined;
		}

		const details = await tmdb.tvShows.details(id!);
		return details;
	} catch (error) {
		console.error('Error fetching show details:', error);
	}
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
