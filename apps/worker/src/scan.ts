import { readdir } from 'node:fs/promises';
import path from 'node:path';
import type { ScanCounts } from '@workspace/contract/api-types';
import { findMovie, recordScanResult, saveMovie, type Database, type Job } from '@workspace/db';
import type { MovieLookup } from './tmdb';

const movieBaseFolder = 'movies';
/** Format: "Movie Name (Year)". Anything else in the folder is not a movie. */
const movieFolderPattern = /^(.*)\s\((\d{4})\)$/;

/** How many problems a result keeps. Its counts keep the true totals. */
export const maxScanErrors = 20;

/** TMDB rejects with its JSON error body, which is not an `Error`. */
const reasonOf = (error: unknown) => {
	const { status_message: tmdbMessage, message } = (error ?? {}) as { status_message?: string; message?: string };
	return tmdbMessage ?? message ?? String(error);
};

const readMovieFolders = async (mediaFolder: string) => {
	try {
		return await readdir(path.resolve(mediaFolder, movieBaseFolder));
	} catch (error) {
		// Reasons reach the admin's browser, and they need no paths from this machine.
		throw new Error(`Could not read the ${movieBaseFolder} folder (${(error as NodeJS.ErrnoException).code}).`);
	}
};

/**
 * Identifies the library's folders on TMDB, and saves each title as it goes, so that a run
 * that stops early keeps what it found. Saving a title twice is safe, so a job can run again.
 *
 * The job fails if there is no token, or if folders were found and none were identified.
 * Partial success is `done`, with its failures in the result.
 *
 * @param lookup Undefined when no TMDB token is set.
 */
export const scanLibrary = async (
	db: Database,
	mediaFolder: string,
	lookup: MovieLookup | undefined,
	job: Job,
	signal: AbortSignal,
) => {
	if (!lookup) {
		throw new Error('No TMDB token is set. Set TMDB_API_READ_ACCESS_TOKEN, restart the worker and scan again.');
	}

	const counts: ScanCounts = { found: 0, added: 0, updated: 0, unmatched: 0, failed: 0 };
	const problems: string[] = [];

	for (const folder of await readMovieFolders(mediaFolder)) {
		const [, name, year] = folder.match(movieFolderPattern) ?? [];
		if (!name || !year) {
			continue;
		}
		signal.throwIfAborted();
		counts.found += 1;

		try {
			const metadata = await lookup({ name, year: Number.parseInt(year, 10) }, signal);
			const tmdbId = metadata?.details.id;
			if (!metadata || !tmdbId) {
				counts.unmatched += 1;
				problems.push(`${folder}: TMDB has no match`);
				continue;
			}
			// Only a scan writes titles, and one runs at a time, so this cannot go stale.
			const isNew = !findMovie(db, tmdbId);
			saveMovie(db, { tmdbId, path: `${movieBaseFolder}/${folder}`, metadata });
			counts[isNew ? 'added' : 'updated'] += 1;
		} catch (error) {
			signal.throwIfAborted();
			counts.failed += 1;
			problems.push(`${folder}: ${reasonOf(error)}`);
		}
	}

	recordScanResult(db, job.id, {
		finishedAt: new Date().toISOString(),
		counts,
		errors: problems.slice(0, maxScanErrors),
	});

	if (counts.found > 0 && counts.added + counts.updated === 0) {
		throw new Error(`None of the ${counts.found} folders could be identified. First problem: ${problems[0]}`);
	}
};
