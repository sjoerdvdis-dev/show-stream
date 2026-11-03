import { z } from 'zod';
import type { Credits, Images, MovieDetails } from 'tmdb-ts';

const isObject = (value: unknown) => typeof value === 'object' && value !== null;

/** TMDB data passes through as it arrived: typed, but not validated field by field. */
const tmdbPayload = <T>() => z.custom<T>(isObject);

/**
 * Media API
 */
export const mediaTypeSchema = z.enum(['movie', 'show']);
export type MediaType = z.infer<typeof mediaTypeSchema>;

export const transcodeStatusSchema = z.enum(['not ready', 'in progress', 'ready', 'failed']);
export type TranscodeStatus = z.infer<typeof transcodeStatusSchema>;

const movieMetadataShape = z.object({
	details: tmdbPayload<MovieDetails>(),
	credits: tmdbPayload<Credits>(),
	images: tmdbPayload<Images>(),
	transcodeStatus: transcodeStatusSchema.optional(),
	/** Why the transcode failed, when `transcodeStatus` is `failed`. */
	transcodeError: z.string().optional(),
});
/** An interface, so that types inferred in other packages can refer to it by name. */
export interface MovieMetadata extends z.infer<typeof movieMetadataShape> {}
export const movieMetadataSchema: z.ZodType<MovieMetadata> = movieMetadataShape;

export const movieResponseSchema = z.object({ metadata: movieMetadataSchema });
export type MovieAPIData = z.infer<typeof movieResponseSchema>;

export const moviesResponseSchema = z.object({ movies: z.array(movieMetadataSchema) });
export type MoviesAPIData = z.infer<typeof moviesResponseSchema>;

export const showsResponseSchema = z.object({ shows: z.array(z.record(z.string(), z.unknown())) });
export type ShowsAPIData = z.infer<typeof showsResponseSchema>;

/**
 * Video API
 */
export const transcodeRequestResponseSchema = z.object({
	status: transcodeStatusSchema,
	/** Why the transcode failed, when `status` is `failed`. */
	error: z.string().optional(),
});
export type TranscodeRequestAPIData = z.infer<typeof transcodeRequestResponseSchema>;

export const transcodePlaylistResponseSchema = z.object({ playlistUrl: z.string() });
export type TranscodePlaylistAPIData = z.infer<typeof transcodePlaylistResponseSchema>;

/**
 * Scan API
 */
export const scanStatusSchema = z.enum(['queued', 'running', 'done', 'failed']);
export type ScanStatus = z.infer<typeof scanStatusSchema>;

export const scanCountsSchema = z.object({
	/** Folders named `Title (Year)`. */
	found: z.number(),
	added: z.number(),
	updated: z.number(),
	/** Folders that TMDB has no match for. */
	unmatched: z.number(),
	/** Folders whose lookup or save failed. */
	failed: z.number(),
});
export type ScanCounts = z.infer<typeof scanCountsSchema>;

export const scanSchema = z.object({
	status: scanStatusSchema,
	/** ISO 8601. When the scan finished, or, if it has no result, when it was asked for. */
	time: z.string(),
	/** All zero until the scan finishes. */
	counts: scanCountsSchema,
	/** Why the scan failed, when `status` is `failed`. */
	error: z.string().optional(),
	/** What went wrong with single folders. The list is capped, and `counts` keeps the true totals. */
	errors: z.array(z.string()),
});
export type Scan = z.infer<typeof scanSchema>;

/** `scan` is null until the first scan is asked for. */
export const scanResponseSchema = z.object({ scan: scanSchema.nullable() });
export type ScanAPIData = z.infer<typeof scanResponseSchema>;

/**
 * Notifications
 */
/** The title's TMDB ID, as its routes use it. Null only for a title without one, which cannot be transcoded. */
const notifiedTitleId = z.number().nullable();

export const notificationTranscodeReadySchema = z.object({
	type: z.literal('transcode:ready'),
	data: z.object({ id: notifiedTitleId, title: z.string() }),
});
export type NotificationTranscodeReady = z.infer<typeof notificationTranscodeReadySchema>;

export const notificationTranscodeFailedSchema = z.object({
	type: z.literal('transcode:failed'),
	data: z.object({ id: notifiedTitleId, title: z.string(), error: z.string() }),
});
export type NotificationTranscodeFailed = z.infer<typeof notificationTranscodeFailedSchema>;

export const apiNotificationSchema = z.discriminatedUnion('type', [
	notificationTranscodeReadySchema,
	notificationTranscodeFailedSchema,
]);
export type APINotification = z.infer<typeof apiNotificationSchema>;

/**
 * Auth
 */
export const userRoleSchema = z.enum(['owner', 'admin', 'user']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({ userId: z.string(), username: z.string(), role: userRoleSchema });
export type User = z.infer<typeof userSchema>;

export const setupStatusResponseSchema = z.object({ needed: z.boolean() });
export type SetupStatusAPIData = z.infer<typeof setupStatusResponseSchema>;

/** Setup, login and `GET /auth/me` all answer with the user. Login also sets the cookie. */
export const sessionResponseSchema = z.object({ user: userSchema });
export type SessionAPIData = z.infer<typeof sessionResponseSchema>;

export const logoutResponseSchema = z.object({ success: z.boolean() });
export type LogoutAPIData = z.infer<typeof logoutResponseSchema>;
