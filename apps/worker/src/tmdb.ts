import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import type { MovieMetadata } from '@workspace/contract/api-types';
import type { ImageFormat, ImageKind } from '@workspace/db';
import { TMDB } from 'tmdb-ts';

const includedCrewJobs = ['Director'];
const lookupTimeoutMs = 30_000;

export type MovieQuery = { name: string; year: number };

/** Resolves with undefined if TMDB has no match, and rejects if it could not be asked. */
export type MovieLookup = (query: MovieQuery, signal: AbortSignal) => Promise<MovieMetadata | undefined>;

export const createMovieLookup =
	(token: string): MovieLookup =>
	async ({ name, year }, signal) => {
		// A hung request would otherwise hold up every job behind this one.
		const fetchInTime: typeof fetch = (input, init) =>
			fetch(input, { ...init, signal: AbortSignal.any([signal, AbortSignal.timeout(lookupTimeoutMs)]) });
		const tmdb = new TMDB(token, { fetch: fetchInTime });

		const { id } = (await tmdb.search.movies({ query: name, year })).results[0] ?? {};
		if (!id) {
			return undefined;
		}

		const details = await tmdb.movies.details(id);
		const credits = await tmdb.movies.credits(id);
		const images = await tmdb.movies.images(id);

		credits.crew = credits.crew.filter((crew) => includedCrewJobs.includes(crew.job));

		// Only English art.
		images.posters = images.posters.filter((poster) => poster.iso_639_1 === 'en');
		images.backdrops = images.backdrops.filter((backdrop) => backdrop.iso_639_1 === 'en');
		images.logos = images.logos.filter((logo) => logo.iso_639_1 === 'en');

		return { details, credits, images };
	};

/** TMDB's fixed sizes: enough for a card, and for the background of a page. */
const imageSizes: Record<ImageKind, string> = { poster: 'w500', backdrop: 'w1280' };
const imageTimeoutMs = 60_000;

const formatOfContentType: Record<string, ImageFormat> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
};

/** A file path as TMDB gives it, such as `/abc123.jpg`. */
const tmdbImagePath = /^\/[\w-]+\.\w+$/;

/**
 * Downloads one image of a title into `file`, and resolves with its format. Rejects with a
 * reason a user can read if TMDB refuses it, sends something else or takes too long, and may
 * then leave part of the file behind. Image downloads need no token.
 *
 * @param source The file path from TMDB's details, such as `poster_path`.
 */
export type ImageDownload = (kind: ImageKind, source: string, file: string, signal: AbortSignal) => Promise<ImageFormat>;

export const downloadImage: ImageDownload = async (kind, source, file, signal) => {
	if (!tmdbImagePath.test(source)) {
		throw new Error('TMDB gave an image path that is not a file name');
	}
	// One signal for the request and the body, so that a body that stops arriving times out too.
	const inTime = AbortSignal.any([signal, AbortSignal.timeout(imageTimeoutMs)]);
	const response = await fetch(`https://image.tmdb.org/t/p/${imageSizes[kind]}${source}`, { signal: inTime });
	const format = formatOfContentType[response.headers.get('content-type')?.split(';')[0]?.trim() ?? ''];
	if (!response.ok || !response.body || !format) {
		await response.body?.cancel();
		throw new Error(response.ok ? 'TMDB sent something that is not an image' : `TMDB answered ${response.status}`);
	}
	await pipeline(Readable.fromWeb(response.body as NodeReadableStream), createWriteStream(file), { signal: inTime });
	return format;
};
