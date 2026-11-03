import path from 'node:path';
import { and, eq } from 'drizzle-orm';
import type { MediaType } from '@workspace/contract/api-types';
import type { Database } from './connection.js';
import { media, type ImageFormat, type ImageKind } from './schema.js';

/**
 * A title's stored art. The worker writes the files and the API serves them, so both build
 * their paths here, from the title and the kind of image alone. The folder sits beside the HLS
 * cache, whose folders have numeric names, so a stream can never reach it.
 */

/** Relative to the media folder. Keyed by TMDB ID, which stays the same if the database is rebuilt. */
export const storedImageFolder = (type: MediaType, tmdbId: number) =>
	path.join('cache', 'images', type, String(tmdbId));

/** Relative to the media folder. */
export const storedImagePath = (type: MediaType, tmdbId: number, kind: ImageKind, format: ImageFormat) =>
	path.join(storedImageFolder(type, tmdbId), `${kind}.${format}`);

const formatColumns = { poster: media.posterFormat, backdrop: media.backdropFormat } as const;

const formatFields = { poster: 'posterFormat', backdrop: 'backdropFormat' } as const;

/** Records that a title's image is stored in this format. */
export const recordStoredImage = (db: Database, mediaId: number, kind: ImageKind, format: ImageFormat): void => {
	db.update(media)
		.set({ [formatFields[kind]]: format })
		.where(eq(media.id, mediaId))
		.run();
};

/** The stored image of a title, relative to the media folder, or undefined if none is stored. */
export const findStoredImage = (db: Database, type: MediaType, tmdbId: number, kind: ImageKind): string | undefined => {
	const row = db
		.select({ format: formatColumns[kind] })
		.from(media)
		.where(and(eq(media.type, type), eq(media.tmdbId, tmdbId)))
		.get();
	return row?.format ? storedImagePath(type, tmdbId, kind, row.format) : undefined;
};
