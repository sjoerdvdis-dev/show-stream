import path from 'path';
import fs from 'fs';
import { config } from './config';
import { MediaModel, MetadataModel, MovieModel, requireDbConnection, ShowModel } from './db';
import { notFound } from './errors';
import { getTranscoding } from './video';
import { TMDB } from 'tmdb-ts';
import type { MovieDetails, TvShowDetails } from 'tmdb-ts';
import type { Logger } from 'winston';
import type {
	MovieAPIData,
	MovieMetadata,
	MoviesAPIData,
	ShowsAPIData,
} from '@workspace/contract/api-types';
import type { MediaDocument, ShowDocument, MovieDocument } from '@workspace/contract/db-types';

const includedCrewJobs = ['Director'];

/**
 * Media API
 * - requests for media information
 */

// /movies
// -> metadata of all movies
export const getMovies = async (): Promise<MoviesAPIData> => {
	const movies = await findMovies();
	const moviesData: MovieMetadata[] = [];
	for (const movie of movies) {
		const { id, metadata } = movie;
		const transcoding = await getTranscoding(id);
		moviesData.push({ ...metadata, transcodeStatus: transcoding?.status || 'not ready' });
	}
	return { movies: moviesData };
};

// /movies/:id
// -> metadata of a specific movie
export const getMovie = async (params: { id: number }): Promise<MovieAPIData> => {
	const { id } = params;
	const media = await findMedia(id);
	const movie = media?.type === 'movie' ? await MovieModel.findOne({ id }).lean() : null;
	if (!movie) {
		throw notFound('Movie');
	}
	const transcoding = await getTranscoding(id);
	return { metadata: { ...movie.metadata, transcodeStatus: transcoding?.status || 'not ready' } };
};

// /shows
// -> metadata of all shows
export const getShows = async (): Promise<ShowsAPIData> => {
	const shows = await findShows();
	return { shows: shows.map((show) => show.metadata) };
};

// /shows/:id
// -> metadata of a specific show
// 

/**
 * Media Scan
 * Creates metadata scan of Movies (later Shows) folder
 */

type IdentifiedMovie = MovieDocument;
const tmdb = new TMDB(config.tmdbToken);

export const mediaScan = async (mediaFolder: string, logger: Logger): Promise<void> => {
	const identifiedMovies = await movieScan(mediaFolder, logger);

	await requireDbConnection();

	for (const movie of identifiedMovies) {
		const { id, path, metadata } = movie;

		const mediaExists = await MediaModel.exists({ id });
		const movieExists = await MovieModel.exists({ id });

		if (mediaExists) {
			await MediaModel.updateOne({ id }, { $set: { type: 'movie' } });
		} else {
			await MediaModel.create({ id, type: 'movie' });
		}

		if (movieExists) {
			await MovieModel.updateOne({ id }, { $set: { path, metadata } });
		} else {
			await MovieModel.create({ id, path, metadata });
		}
	}

	const lastScanTime = new Date();
	const metadataExists = await MetadataModel.exists({ id: 0 });
	if (!metadataExists) {
		await MetadataModel.create({ id: 0, lastScanTime });
	} else {
		await MetadataModel.updateOne({ id: 0 }, { $set: { lastScanTime } });
	}

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
				id: movieMetadata.details.id,
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

export const findMedia = async (id: number): Promise<MediaDocument | null> => {
	await requireDbConnection();
	return MediaModel.findOne({ id }).lean();
};

export const findMovies = async (): Promise<MovieDocument[]> => {
	await requireDbConnection();
	return MovieModel.find({}).lean();
};

export const findShows = async (): Promise<ShowDocument[]> => {
	await requireDbConnection();
	return ShowModel.find({}).lean();
};

export const findTranscodeMediaInfo = async (id: number): Promise<{ path?: string; title?: string } | null> => {
	const media = await findMedia(id);

	if (media?.type === 'movie') {
		const movie = await MovieModel.findOne({ id }).lean();
		return { path: movie?.path, title: movie?.metadata.details.title };
	}

	return null;
};

const acceptedVideoExtensions = ['.mp4'];
export const findMediaVideoPath = async (mediaPath: string): Promise<string | null> => {
	const videoFiles = fs.readdirSync(mediaPath);
	const videoFile = videoFiles.find((file) => {
		return acceptedVideoExtensions.includes(path.extname(file));
	});
	return videoFile ? path.resolve(mediaPath, videoFile) : null;
};
