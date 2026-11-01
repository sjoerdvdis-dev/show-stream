import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, type TestApi } from '../support/api';
import { hasFfmpeg } from '../support/ffmpeg';
import { addCorruptVideo, seedMovie, type SeededMovie } from '../support/seed';

describe.skipIf(!hasFfmpeg)('audit finding 6', () => {
	let api: TestApi;
	let movie: SeededMovie;

	beforeAll(async () => {
		api = await startApi();
		movie = await seedMovie(api, 3006, 'Corrupt');
		await addCorruptVideo(api, movie);
	});

	afterAll(async () => {
		await api?.stop();
	});

	it.fails('finding 6, fixed by item 8: a corrupt file fails its job and the API stays up', async () => {
		await api.get(`/transcode/request/${movie.id}`);

		await api.waitFor(async () => {
			const { metadata } = await (await api.get(`/movie/${movie.id}`)).json();
			expect(metadata.transcodeStatus).toBe('failed');
		});
	});
});
