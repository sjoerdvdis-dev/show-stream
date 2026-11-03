import { and, asc, count, desc, eq, exists, gte, inArray, isNotNull, lte, sql, type SQL } from 'drizzle-orm';
import type { MediaType, TranscodeStatus } from '@workspace/contract/api-types';
import type { LibraryItem, LibraryQuery, LibrarySort } from '@workspace/contract/library';
import type { Database } from './connection.js';
import { jobs, media, mediaGenres } from './schema.js';

/**
 * The library's paged list and its facets. Everything runs in SQL, for any media type, so that
 * no call reads the whole library.
 */

/** A title's playback status, by the same rule as `transcodeStatusOfJob`. No job yet is `not ready`. */
const transcodeStatus = sql<TranscodeStatus>`CASE ${jobs.status}
	WHEN 'queued' THEN 'in progress'
	WHEN 'running' THEN 'in progress'
	WHEN 'done' THEN 'ready'
	WHEN 'failed' THEN 'failed'
	ELSE 'not ready' END`;

const transcodeJobOfTitle = and(eq(jobs.mediaId, media.id), eq(jobs.type, 'transcode'));

const sortColumns: Record<LibrarySort, SQL> = {
	title: sql`${media.title} COLLATE NOCASE`,
	year: sql`${media.year}`,
	releaseDate: sql`${media.releaseDate}`,
	runtime: sql`${media.runtime}`,
	rating: sql`${media.voteAverage}`,
	popularity: sql`${media.popularity}`,
};

/**
 * Turns what a user typed into an FTS5 query that matches the start of every word, in any
 * order. Each word is quoted, so FTS syntax in the input is only text. Returns undefined if
 * nothing in it can match.
 */
export const toSearchQuery = (text: string) => {
	const words = text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word));
	return words.length > 0 ? words.map((word) => `"${word.replaceAll('"', '""')}"*`).join(' ') : undefined;
};

/** A search with nothing that can match finds nothing. */
const nothing = sql`0`;

const filtersOf = (type: MediaType, query: LibraryQuery) => {
	const filters: (SQL | undefined)[] = [
		eq(media.type, type),
		// Every route of a title uses its TMDB ID, so a title without one cannot be listed.
		isNotNull(media.tmdbId),
	];
	const add = (filter: SQL | undefined) => filters.push(filter);

	if (query.q) {
		const search = toSearchQuery(query.q);
		add(search ? sql`${media.id} IN (SELECT rowid FROM media_search WHERE media_search MATCH ${search})` : nothing);
	}
	if (query.yearMin !== undefined) add(gte(media.year, query.yearMin));
	if (query.yearMax !== undefined) add(lte(media.year, query.yearMax));
	if (query.releaseDateFrom !== undefined) add(gte(media.releaseDate, query.releaseDateFrom));
	if (query.releaseDateTo !== undefined) add(lte(media.releaseDate, query.releaseDateTo));
	if (query.runtimeMin !== undefined) add(gte(media.runtime, query.runtimeMin));
	if (query.runtimeMax !== undefined) add(lte(media.runtime, query.runtimeMax));
	if (query.ratingMin !== undefined) add(gte(media.voteAverage, query.ratingMin));
	if (query.ratingMax !== undefined) add(lte(media.voteAverage, query.ratingMax));
	if (query.genre?.length) {
		add(
			exists(
				sql`SELECT 1 FROM ${mediaGenres} WHERE ${mediaGenres.mediaId} = ${media.id} AND ${inArray(mediaGenres.genre, query.genre)}`,
			),
		);
	}
	if (query.status?.length) add(inArray(transcodeStatus, query.status));

	return and(...filters);
};

/** The genres of a title as a JSON array, sorted by name. */
const genresOfTitle = sql<string>`(SELECT json_group_array(genre) FROM
	(SELECT ${mediaGenres.genre} AS genre FROM ${mediaGenres} WHERE ${mediaGenres.mediaId} = ${media.id} ORDER BY genre))`;

export type LibraryPageResult = { items: LibraryItem[]; total: number };

/**
 * One page of a media type's titles. Values that a title lacks sort last in either order, and
 * ties break on the title's row, so that pages never overlap or skip.
 */
export const listLibrary = (db: Database, type: MediaType, query: LibraryQuery): LibraryPageResult =>
	// One read transaction, so that the page and the total see the same data.
	db.transaction((tx) => {
		const where = filtersOf(type, query);
		const column = sortColumns[query.sort];

		const rows = tx
			.select({
				id: media.tmdbId,
				title: media.title,
				year: media.year,
				releaseDate: media.releaseDate,
				runtime: media.runtime,
				rating: media.voteAverage,
				genres: genresOfTitle,
				status: transcodeStatus,
				posterFormat: media.posterFormat,
				backdropFormat: media.backdropFormat,
			})
			.from(media)
			.leftJoin(jobs, transcodeJobOfTitle)
			.where(where)
			.orderBy(sql`${column} IS NULL`, query.order === 'asc' ? asc(column) : desc(column), asc(media.id))
			.limit(query.pageSize)
			.offset((query.page - 1) * query.pageSize)
			.all();

		const [{ total } = { total: 0 }] = tx
			.select({ total: count() })
			.from(media)
			.leftJoin(jobs, transcodeJobOfTitle)
			.where(where)
			.all();

		const items = rows.map(({ id, genres, posterFormat, backdropFormat, ...item }) => ({
			...item,
			// The filter above leaves out titles with no TMDB ID.
			id: id!,
			genres: JSON.parse(genres) as string[],
			hasPoster: posterFormat !== null,
			hasBackdrop: backdropFormat !== null,
		}));

		return { items, total };
	});
