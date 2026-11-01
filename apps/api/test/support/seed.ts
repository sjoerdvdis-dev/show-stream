import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import type { TestApi } from './api';

export type SeededMovie = {
	id: number;
	title: string;
	/** Folder inside the media folder, in the form the scan would store. */
	folder: string;
};

/**
 * Adds a movie the way a successful scan would.
 *
 * This is the only place that writes to the database directly, because a scan needs TMDB
 * and no other route creates a movie. Phase 1 item 6 replaces it.
 */
export const seedMovie = async (api: TestApi, id: number, title = `Movie ${id}`): Promise<SeededMovie> => {
	const folder = `movies/${title} (2024)`;
	await mkdir(path.join(api.mediaFolder, folder), { recursive: true });

	const connection = await mongoose.createConnection(api.databaseUrl).asPromise();
	try {
		await connection.collection('media').insertOne({ id, type: 'movie' });
		await connection.collection('movies').insertOne({
			id,
			path: folder,
			metadata: {
				details: { id, title, release_date: '2024-01-01' },
				credits: { cast: [], crew: [] },
				images: { posters: [], backdrops: [], logos: [] },
			},
		});
	} finally {
		await connection.close();
	}

	return { id, title, folder };
};

/** Writes a file that has a video extension but is not a video. */
export const addCorruptVideo = async (api: TestApi, movie: SeededMovie) => {
	await writeFile(path.join(api.mediaFolder, movie.folder, 'corrupt.mp4'), 'This is not a video.');
};
