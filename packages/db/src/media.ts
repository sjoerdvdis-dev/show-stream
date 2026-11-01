import { and, asc, eq, getTableColumns } from 'drizzle-orm';
import type { MovieMetadata, TranscodeStatus } from '@workspace/contract/api-types';
import type { Database } from './connection.js';
import { jobs, media, type Media, type NewMedia, type ShowMetadata } from './schema.js';

export type Movie = Media & { metadata: MovieMetadata; transcodeStatus: TranscodeStatus };
export type Show = Media & { metadata: ShowMetadata };

/**
 * Adds a title, or updates the one with the same type and TMDB ID. A title with no TMDB ID
 * has nothing to match on, so each call adds a row.
 */
export const saveMedia = (db: Database, title: NewMedia): Media =>
	db
		.insert(media)
		.values(title)
		.onConflictDoUpdate({ target: [media.type, media.tmdbId], set: title })
		.returning()
		.all()[0]!;

/** Saves a movie that TMDB identified, with its typed columns read from the payload. */
export const saveMovie = (db: Database, movie: { tmdbId: number; path: string; metadata: MovieMetadata }): Media => {
	const { title, release_date, runtime, vote_average, vote_count, popularity } = movie.metadata.details;
	return saveMedia(db, {
		...movie,
		type: 'movie',
		title,
		year: parseYear(release_date),
		releaseDate: release_date || null,
		runtime: runtime ?? null,
		voteAverage: vote_average ?? null,
		voteCount: vote_count ?? null,
		popularity: popularity ?? null,
	});
};

/** `release_date` is `YYYY-MM-DD`, and empty when TMDB has none. */
const parseYear = (releaseDate: string | undefined) => {
	const year = Number.parseInt(releaseDate ?? '', 10);
	return Number.isNaN(year) ? null : year;
};

/** A title with no job yet has not been requested, which reads as `not ready`. */
const selectMovies = (db: Database) =>
	db
		.select({ ...getTableColumns(media), jobStatus: jobs.status })
		.from(media)
		.leftJoin(jobs, and(eq(jobs.mediaId, media.id), eq(jobs.type, 'transcode')));

type MovieRow = Media & { jobStatus: TranscodeStatus | null };

const toMovie = ({ jobStatus, ...movie }: MovieRow): Movie => ({
	...movie,
	metadata: movie.metadata as MovieMetadata,
	transcodeStatus: jobStatus ?? 'not ready',
});

export const listMovies = (db: Database): Movie[] =>
	selectMovies(db).where(eq(media.type, 'movie')).orderBy(asc(media.id)).all().map(toMovie);

export const findMovie = (db: Database, tmdbId: number): Movie | undefined => {
	const movie = selectMovies(db)
		.where(and(eq(media.type, 'movie'), eq(media.tmdbId, tmdbId)))
		.get();
	return movie && toMovie(movie);
};

export const listShows = (db: Database): Show[] =>
	db.select().from(media).where(eq(media.type, 'show')).orderBy(asc(media.id)).all() as Show[];
