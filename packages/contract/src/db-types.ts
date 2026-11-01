import type { MovieMetadata, TranscodeStatus } from './api-types.js';

export type { TranscodeStatus };

export interface MetadataDocument {
	lastScanTime: Date;
}

export interface MediaDocument {
	id: number;
	type: MediaType;
}
export type MediaType = 'movie' | 'show';

export interface MovieDocument {
	id: number;
	path: string;
	metadata: MovieMetadata;
}

export interface ShowDocument {
	id: number;
	path: string;
	metadata: {};
}

export interface TranscodeDocument {
	id: number;
	status: TranscodeStatus;
	lastRequestDate?: Date;
}

export interface UserDocument {
	username: string;
	password: string;
}
