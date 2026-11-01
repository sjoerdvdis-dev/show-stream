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

export const transcodeStatusSchema = z.enum(['not ready', 'in progress', 'ready']);
export type TranscodeStatus = z.infer<typeof transcodeStatusSchema>;

const movieMetadataShape = z.object({
	details: tmdbPayload<MovieDetails>(),
	credits: tmdbPayload<Credits>(),
	images: tmdbPayload<Images>(),
	transcodeStatus: transcodeStatusSchema.optional(),
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
export const transcodeRequestResponseSchema = z.object({ status: transcodeStatusSchema });
export type TranscodeRequestAPIData = z.infer<typeof transcodeRequestResponseSchema>;

export const transcodePlaylistResponseSchema = z.object({ playlistUrl: z.string() });
export type TranscodePlaylistAPIData = z.infer<typeof transcodePlaylistResponseSchema>;

/**
 * Notifications
 */
export const notificationTranscodeReadySchema = z.object({
	type: z.literal('transcode:ready'),
	data: z.object({ title: z.string() }),
});
export type NotificationTranscodeReady = z.infer<typeof notificationTranscodeReadySchema>;

export const apiNotificationSchema = z.discriminatedUnion('type', [notificationTranscodeReadySchema]);
export type APINotification = z.infer<typeof apiNotificationSchema>;

/**
 * Auth
 */
export const userSchema = z.object({ userId: z.string(), username: z.string() });
export type User = z.infer<typeof userSchema>;

export const loginResponseSchema = z.object({ token: z.string() });
export type LoginAPIData = z.infer<typeof loginResponseSchema>;

export const registerResponseSchema = z.object({ success: z.boolean() });
export type RegisterAPIData = z.infer<typeof registerResponseSchema>;

export const authenticateResponseSchema = z.object({ user: userSchema, valid: z.boolean() });
export type AuthenticateAPIData = z.infer<typeof authenticateResponseSchema>;
