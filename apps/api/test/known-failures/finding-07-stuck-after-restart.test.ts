import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, type TestApi, type TestClient } from '../support/api';
import { addValidVideo, hasFfmpeg } from '../support/ffmpeg';
import { seedMovie, type SeededMovie } from '../support/seed';

describe.skipIf(!hasFfmpeg)('audit finding 7', () => {
	let api: TestApi;
	let owner: TestClient;
	let movie: SeededMovie;

	const transcodeStatus = async () => {
		const { metadata } = await (await owner.get(`/movie/${movie.id}`)).json();
		return metadata.transcodeStatus;
	};

	// Interrupting the job is setup, so that a problem here fails the suite.
	beforeAll(async () => {
		api = await startApi();
		owner = await api.createOwner();
		movie = await seedMovie(api, 3007, 'Interrupted');
		await addValidVideo(api, movie);
		await owner.get(`/transcode/request/${movie.id}`);
		await api.waitFor(async () => expect(await transcodeStatus()).toBe('in progress'));
		await api.restart();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it.fails('finding 7, fixed by item 8: a restart does not leave a title in progress', async () => {
		await api.waitFor(async () => expect(await transcodeStatus()).not.toBe('in progress'), 3_000);
	});
});
