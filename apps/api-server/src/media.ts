import path from 'path';
import fs from 'fs';
import { ensureDbConnection, MediaModel, MetadataModel, MovieModel, ShowModel } from './db';
import { getTranscoding } from './video';
import { TMDB } from 'tmdb-ts';
import type { MovieDetails, TvShowDetails } from 'tmdb-ts';
import type { Logger } from 'winston';
import type {
	BaseAPIResponse,
	MovieAPIData,
	MovieMetadata,
	MoviesAPIData,
	ShowsAPIData,
} from '@workspace/types/api-types';
import type { MediaDocument, ShowDocument, MovieDocument, MediaType } from '@workspace/types/db-types';

const includedCrewJobs = ['Director'];

/**
 * Media API
 * - requests for media information
 */

// /movies
// -> metadata of all movies
export const getMovies = async (): Promise<BaseAPIResponse & { data?: MoviesAPIData }> => {
	const { movies, error } = await findMovies();
	if (movies === undefined || error) {
		return { status: 400, error };
	}
	const moviesData: MovieMetadata[] = [];
	for (const movie of movies) {
		const { id, metadata } = movie;
		const transcoding = await getTranscoding(id);
		moviesData.push({ ...metadata, transcodeStatus: transcoding?.status || 'not ready' });
	}
	return { status: 200, data: { movies: moviesData } };
};

// /movies/:id
// -> metadata of a specific movie
export const getMovie = async (params: { id: number }): Promise<BaseAPIResponse & { data?: MovieAPIData }> => {
	const { id } = params;
	const { error, type, data } = await findMediaData(id);
	if (error || type !== 'movie' || !data) {
		return { status: 400, error: error || 'Movie not found' };
	}
	return { status: 200, data };
}

// /shows
// -> metadata of all shows
export const getShows = async (): Promise<BaseAPIResponse & { data?: ShowsAPIData }> => {
	const { shows, error } = await findShows();
	if (shows === undefined || error) {
		return { status: 400, error };
	}
	return { status: 200, data: { shows: shows.map((show) => show.metadata) } };
};

// /shows/:id
// -> metadata of a specific show
// 

/**
 * Media Scan
 * Creates metadata scan of Movies (later Shows) folder
 */

type IdentifiedMovie = MovieDocument;
const tmdb = new TMDB(process.env.TMDB_API_READ_ACCESS_TOKEN || '');

export const mediaScan = async (mediaFolder: string, logger: Logger): Promise<{ success: boolean }> => {
	const identifiedMovies = await movieScan(mediaFolder, logger);

	if (!(await ensureDbConnection())) {
		logger.log('error', 'Database not connected during media scan');
		return { success: false };
	}

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
	return { success: true };
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

export const findMediaData = async (id: number): Promise<{ error?: string; type?: MediaType, data?: MovieAPIData }> => {
	if (!(await ensureDbConnection())) {
		return { error: 'Database not connected' };
	}

	const { error, media } = await findMedia(id);
	if (error || !media) {
		return { error: 'Media not found' };
	}

	const { type } = media;

	if (type === 'movie') {
		const movie = await MovieModel.findOne({ id }).lean();
		const transcoding = await getTranscoding(id);
		return movie
			? { type, data: { metadata: { ...movie.metadata, transcodeStatus: transcoding?.status || 'not ready' } } }
			: { error: 'Movie not found' };
	}

	if (type === 'show') {
	}

	return { error: 'Media not found' };
};

export const findMedia = async (id: number): Promise<{ error?: string; media?: MediaDocument }> => {
	if (!(await ensureDbConnection())) {
		return { error: 'Database not connected' };
	}

	const media = await MediaModel.findOne({ id }).lean();
	if (!media) {
		return { error: 'Media not found' };
	}

	return { media };
};

export const findMovies = async (): Promise<{ movies?: MovieDocument[]; error?: string }> => {
	if (!(await ensureDbConnection())) {
		return { error: 'Database not connected' };
	}
	const movies = await MovieModel.find({}).lean();
	return { movies };
};

export const findShows = async (): Promise<{ shows?: ShowDocument[]; error?: string }> => {
	if (!(await ensureDbConnection())) {
		return { error: 'Database not connected' };
	}
	const shows = await ShowModel.find({}).lean();
	return { shows };
};

export const findTranscodeMediaInfo = async (id: number): Promise<{ path?: string; title?: string } | null> => {
	const { error, media } = await findMedia(id);

	if (error || !media) {
		return null;
	}

	const { type } = media;

	if (type === 'movie') {
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
