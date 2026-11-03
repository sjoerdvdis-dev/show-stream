import { access, mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import {
	imageFormats,
	imageKinds,
	recordStoredImage,
	storedImageFolder,
	storedImagePath,
	type Database,
	type ImageKind,
	type Media,
} from '@workspace/db';
import type { ImageDownload } from './tmdb';

const exists = (file: string) =>
	access(file).then(
		() => true,
		() => false,
	);

/** The format of a stored image, from the files themselves, so that a rebuilt database finds them too. */
const findStoredFormat = async (mediaFolder: string, title: StoredTitle, kind: ImageKind) => {
	for (const format of imageFormats) {
		if (await exists(path.resolve(mediaFolder, storedImagePath(title.type, title.tmdbId, kind, format)))) {
			return format;
		}
	}
	return undefined;
};

type StoredTitle = Pick<Media, 'id' | 'type'> & { tmdbId: number };

/** TMDB's file path of each kind of image, such as `poster_path`. A missing one has no art to store. */
export type ImageSources = Partial<Record<ImageKind, string | null>>;

/**
 * Stores a title's poster and backdrop beside the HLS cache, and records them for the API. An
 * image already on disk is not fetched again. Each download goes to a temporary name and is
 * renamed only once complete, so a killed run leaves nothing that looks finished.
 *
 * @returns What went wrong, as reasons a user can read. A failed image never fails its title.
 */
export const storeImages = async (
	db: Database,
	mediaFolder: string,
	title: StoredTitle,
	sources: ImageSources,
	download: ImageDownload,
	signal: AbortSignal,
): Promise<string[]> => {
	const problems: string[] = [];
	const folder = path.resolve(mediaFolder, storedImageFolder(title.type, title.tmdbId));

	for (const kind of imageKinds) {
		const stored = await findStoredFormat(mediaFolder, title, kind);
		if (stored) {
			recordStoredImage(db, title.id, kind, stored);
			continue;
		}
		const source = sources[kind];
		if (!source) {
			continue;
		}

		const partial = path.join(folder, `${kind}.partial`);
		try {
			await mkdir(folder, { recursive: true });
			const format = await download(kind, source, partial, signal);
			await rename(partial, path.resolve(mediaFolder, storedImagePath(title.type, title.tmdbId, kind, format)));
			recordStoredImage(db, title.id, kind, format);
		} catch (error) {
			await rm(partial, { force: true });
			signal.throwIfAborted();
			// Reasons reach the admin's browser, and they need no paths from this machine.
			const reason = String((error as Error)?.message ?? error).replaceAll(`${mediaFolder}${path.sep}`, '');
			problems.push(`could not store its ${kind}: ${reason}`);
		}
	}

	return problems;
};
