import type { MovieMetadata } from '@workspace/contract/api-types';
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
