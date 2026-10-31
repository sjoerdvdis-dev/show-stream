import type { TranscodeStatus } from "@workspace/types/db-types";
import type { Credits, Images, MovieDetails, TvShowDetails } from 'tmdb-ts';

export interface BaseAPIResponse {
  status: number;
  error?: string;
}

/**
 * Media API
 */
export interface MovieMetadata {
  details: MovieDetails;
  credits: Credits;
  images: Images;
  transcodeStatus?: TranscodeStatus;
}
export interface MovieAPIData {
	metadata: MovieMetadata;
}
export interface MoviesAPIData {
  movies: MovieMetadata[];
}
export interface ShowsAPIData {}

/**
 * Video API
 */
export interface TranscodeRequestAPIData {
  status: TranscodeStatus;
}
export interface TranscodePlaylistAPIData {
  playlistUrl?: string;
}

/**
 * Notifications
 */
export type APINotification = NotificationTranscodeReady;
export interface NotificationTranscodeReady {
  type: "transcode:ready";
  data: {
    title: string;
  }
}

/**
 * Auth
 */
export interface User {
  userId: string;
  username: string;
}
export interface LoginAPIData {
  token?: string;
}
export interface RegisterAPIData {
  success?: boolean;
}
export interface AuthenticateAPIData {
  user?: User;
  valid: boolean;
}