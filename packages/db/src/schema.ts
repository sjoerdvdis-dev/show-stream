import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type { MediaType, MovieMetadata, ScanCounts } from '@workspace/contract/api-types';

export type ShowMetadata = Record<string, unknown>;

/** The art a scan stores for each title. */
export const imageKinds = ['poster', 'backdrop'] as const;
export type ImageKind = (typeof imageKinds)[number];

/** The formats a stored image may have. Each is also the file's extension. */
export const imageFormats = ['jpg', 'png', 'webp'] as const;
export type ImageFormat = (typeof imageFormats)[number];

export const users = sqliteTable(
	'users',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		username: text().notNull().unique(),
		passwordHash: text('password_hash').notNull(),
		role: text({ enum: ['owner', 'admin', 'user'] })
			.notNull()
			.default('user'),
	},
	// Allows one owner, so that two simultaneous setups cannot both succeed.
	(table) => [uniqueIndex('users_single_owner').on(table.role).where(sql`role = 'owner'`)],
);

export const sessions = sqliteTable(
	'sessions',
	{
		/** The SHA-256 of the session's token. The token itself is never stored. */
		id: text().primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
	},
	(table) => [index('sessions_user_id_idx').on(table.userId)],
);

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
		/** The TMDB payload as it arrived. Triggers keep `media_genres` and `media_search` in step with it. */
		metadata: text({ mode: 'json' }).$type<MovieMetadata | ShowMetadata>().notNull(),
		/** The format of the stored poster, or NULL if none is stored. */
		posterFormat: text('poster_format', { enum: imageFormats }),
		/** The format of the stored backdrop, or NULL if none is stored. */
		backdropFormat: text('backdrop_format', { enum: imageFormats }),
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

/**
 * A title's genres, by name, so that the library can filter and count them. Triggers fill it
 * from `metadata` whenever a title is saved, so no code writes it.
 */
export const mediaGenres = sqliteTable(
	'media_genres',
	{
		mediaId: integer('media_id')
			.notNull()
			.references(() => media.id, { onDelete: 'cascade' }),
		genre: text().notNull(),
	},
	(table) => [primaryKey({ columns: [table.mediaId, table.genre] }), index('media_genres_genre_idx').on(table.genre)],
);

export type ScanResult = {
	/** ISO 8601. */
	finishedAt: string;
	counts: ScanCounts;
	errors: string[];
};

export type JobPayload = {
	/** ISO 8601. When a client last asked for this title's playlist. */
	lastRequestDate?: string;
	/** The users to tell when this job finishes. */
	requestedBy?: number[];
	/** The video to transcode, relative to the media folder. */
	video?: string;
	/** The folder that holds the result, relative to the media folder. */
	output?: string;
	/** ISO 8601. When an admin asked for this scan. */
	requestedAt?: string;
	/** What a scan found. A scan that stopped early has none. */
	scanResult?: ScanResult;
};

/**
 * The queue between the API and the worker. A title has one job of each type. A job with no
 * title, such as a scan, has a NULL `media_id`, and only one of each type can be active.
 */
export const jobs = sqliteTable(
	'jobs',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		type: text({ enum: ['transcode', 'scan', 'backup'] }).notNull(),
		mediaId: integer('media_id').references(() => media.id, { onDelete: 'cascade' }),
		status: text({ enum: ['queued', 'running', 'done', 'failed'] }).notNull(),
		payload: text({ mode: 'json' }).$type<JobPayload>().notNull().default({}),
		/** How many runs have started. A clean shutdown gives its run back. */
		attempts: integer().notNull().default(0),
		/** Why the job failed. */
		error: text(),
		/** Whether the API has told the users who asked that this job finished. */
		announced: integer({ mode: 'boolean' }).notNull().default(false),
	},
	(table) => [
		uniqueIndex('jobs_type_media_id_unique').on(table.type, table.mediaId),
		// SQLite treats every NULL as distinct, so the index above does not cover these.
		uniqueIndex('jobs_one_active_without_title')
			.on(table.type)
			.where(sql`media_id IS NULL AND status IN ('queued', 'running')`),
		index('jobs_status_announced_idx').on(table.status, table.announced),
	],
);

export const settings = sqliteTable('settings', {
	key: text().primaryKey(),
	value: text().notNull(),
});

export type User = typeof users.$inferSelect;
export type UserRole = User['role'];
export type Session = typeof sessions.$inferSelect;
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type JobStatus = Job['status'];
