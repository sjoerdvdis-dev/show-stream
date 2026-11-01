import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type { MediaType, MovieMetadata, TranscodeStatus } from '@workspace/contract/api-types';

export type ShowMetadata = Record<string, unknown>;

export const users = sqliteTable('users', {
	id: integer().primaryKey({ autoIncrement: true }),
	username: text().notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	role: text({ enum: ['owner', 'admin', 'user'] })
		.notNull()
		.default('user'),
});

/**
 * One row per title. Routes, cache folders and streams still use the TMDB ID of a movie,
 * so the internal `id` stays inside this package and the API's calls to it.
 *
 * SQLite treats every NULL as distinct, so any number of titles can have no TMDB ID.
 */
export const media = sqliteTable(
	'media',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		type: text().$type<MediaType>().notNull(),
		tmdbId: integer('tmdb_id'),
		title: text().notNull(),
		year: integer(),
		/** Folder inside the media folder. */
		path: text().notNull(),
		// The library's filter fields. Phase 2 moves filtering and sorting onto these columns.
		releaseDate: text('release_date'),
		runtime: integer(),
		voteAverage: real('vote_average'),
		voteCount: integer('vote_count'),
		popularity: real(),
		/** The TMDB payload as it arrived. */
		metadata: text({ mode: 'json' }).$type<MovieMetadata | ShowMetadata>().notNull(),
	},
	(table) => [
		uniqueIndex('media_type_tmdb_id_unique').on(table.type, table.tmdbId),
		index('media_type_title_idx').on(table.type, table.title),
		index('media_type_year_idx').on(table.type, table.year),
		index('media_type_release_date_idx').on(table.type, table.releaseDate),
		index('media_type_runtime_idx').on(table.type, table.runtime),
		index('media_type_vote_average_idx').on(table.type, table.voteAverage),
		index('media_type_vote_count_idx').on(table.type, table.voteCount),
		index('media_type_popularity_idx').on(table.type, table.popularity),
	],
);

export type JobPayload = {
	/** ISO 8601. When a client last asked for this title's playlist. */
	lastRequestDate?: string;
};

/**
 * Transcode state lives here so that item 8 can build its queue on this table. A title has
 * one job of each type, and a job with no title, such as a scan, has a NULL `media_id`.
 */
export const jobs = sqliteTable(
	'jobs',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		type: text({ enum: ['transcode'] }).notNull(),
		mediaId: integer('media_id').references(() => media.id, { onDelete: 'cascade' }),
		status: text().$type<TranscodeStatus>().notNull(),
		payload: text({ mode: 'json' }).$type<JobPayload>().notNull().default({}),
		attempts: integer().notNull().default(0),
		error: text(),
	},
	(table) => [uniqueIndex('jobs_type_media_id_unique').on(table.type, table.mediaId)],
);

export const settings = sqliteTable('settings', {
	key: text().primaryKey(),
	value: text().notNull(),
});

export type User = typeof users.$inferSelect;
export type UserRole = User['role'];
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type Job = typeof jobs.$inferSelect;
