import { readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, type TestApi, type TestClient } from './support/api';
import {
	addValidVideo,
	ffmpegWasStopped,
	hasFfmpeg,
	holdFfmpeg,
	releaseFfmpeg,
	waitForHeldRun,
} from './support/ffmpeg';
import { addCorruptVideo, jobRow, seedMovie, type SeededMovie } from './support/seed';

const addHoldableVideo = async (api: TestApi, movie: SeededMovie) => {
	await writeFile(path.join(api.mediaFolder, movie.folder, 'held.mp4'), 'read only by real ffmpeg');
	await holdFfmpeg(api, movie);
};

const metadataOf = async (client: TestClient, movie: SeededMovie) => {
	const { metadata } = await (await client.get(`/movie/${movie.id}`)).json();
	return metadata;
};

const cacheEntries = async (api: TestApi) => readdir(path.join(api.mediaFolder, 'cache')).catch(() => []);

describe.skipIf(!hasFfmpeg)('a corrupt file', () => {
	let api: TestApi;
	let owner: TestClient;
	let movie: SeededMovie;

	const waitForFailure = () =>
		api.waitFor(async () => expect((await metadataOf(owner, movie)).transcodeStatus).toBe('failed'));

	beforeAll(async () => {
		api = await startApi();
		owner = await api.createOwner();
		movie = await seedMovie(api, 3006, 'Corrupt');
		await addCorruptVideo(api, movie);
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('finding 6: fails its job with a reason, and the API stays up', async () => {
		expect(await (await owner.get(`/transcode/request/${movie.id}`)).json()).toEqual({ status: 'in progress' });

		await waitForFailure();

		const { transcodeError } = await metadataOf(owner, movie);
		expect(transcodeError).toContain('Invalid data found');
		expect((await owner.get('/auth/me')).status).toBe(200);
	});

	it('does not show paths from the server in the reason', async () => {
		expect((await metadataOf(owner, movie)).transcodeError).not.toContain(api.mediaFolder);
	});

	it('leaves nothing in the cache', async () => {
		expect(await cacheEntries(api)).toEqual([]);
	});

	it('is not requeued by asking for it again', async () => {
		const response = await owner.get(`/transcode/request/${movie.id}`);

		expect(await response.json()).toEqual({ status: 'failed', error: expect.stringContaining('Invalid data found') });
		await new Promise((resolve) => setTimeout(resolve, 600));
		expect(jobRow(api, movie)).toMatchObject({ status: 'failed', attempts: 1 });
	});

	it('runs again when retried, and fails with its reason', async () => {
		const response = await owner.post(`/transcode/retry/${movie.id}`);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: 'in progress' });
		await waitForFailure();
		expect(jobRow(api, movie)).toMatchObject({ status: 'failed', attempts: 1 });
		expect((await metadataOf(owner, movie)).transcodeError).toContain('Invalid data found');
	});

	it('plays once a good file replaces it, with no reason left over', async () => {
		await rm(path.join(api.mediaFolder, movie.folder, 'corrupt.mp4'));
		await addValidVideo(api, movie);

		await owner.post(`/transcode/retry/${movie.id}`);

		await api.waitFor(async () => expect((await metadataOf(owner, movie)).transcodeStatus).toBe('ready'));
		expect((await metadataOf(owner, movie)).transcodeError).toBeUndefined();
		expect((await owner.get(`/streams/${movie.id}/playlist.m3u8`)).status).toBe(200);
		expect(await cacheEntries(api)).toEqual([String(movie.id)]);
	});
});

describe('retrying', () => {
	let api: TestApi;
	let owner: TestClient;

	beforeAll(async () => {
		api = await startApi();
		owner = await api.createOwner();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('answers 404 for an unknown movie', async () => {
		expect((await owner.post('/transcode/retry/9999')).status).toBe(404);
	});

	it('refuses a movie that has not failed', async () => {
		const movie = await seedMovie(api, 3101, 'Never Tried');

		const response = await owner.post(`/transcode/retry/${movie.id}`);

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ code: 'conflict', message: 'Only a failed transcode can be retried' });
	});

	it('joins a retry that is already running', async () => {
		const movie = await seedMovie(api, 3102, 'Busy');
		await addHoldableVideo(api, movie);
		await owner.get(`/transcode/request/${movie.id}`);
		await waitForHeldRun(api, movie);

		const response = await owner.post(`/transcode/retry/${movie.id}`);

		expect(await response.json()).toEqual({ status: 'in progress' });
		await releaseFfmpeg(api, movie);
		await api.waitFor(async () => expect((await metadataOf(owner, movie)).transcodeStatus).toBe('ready'));
		expect(jobRow(api, movie)?.attempts).toBe(1);
	});

	it.skipIf(!hasFfmpeg)('answers 404 when the file has gone since the failure', async () => {
		const movie = await seedMovie(api, 3103, 'Vanished');
		await addCorruptVideo(api, movie);
		await owner.get(`/transcode/request/${movie.id}`);
		await api.waitFor(async () => expect((await metadataOf(owner, movie)).transcodeStatus).toBe('failed'));

		await rm(path.join(api.mediaFolder, movie.folder, 'corrupt.mp4'));
		const response = await owner.post(`/transcode/retry/${movie.id}`);

		expect(response.status).toBe(404);
		expect(jobRow(api, movie)?.status).toBe('failed');
	});
});

describe('a worker that dies mid-job', () => {
	let api: TestApi;
	let owner: TestClient;

	beforeAll(async () => {
		api = await startApi();
		owner = await api.createOwner();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it.skipIf(!hasFfmpeg)('finding 7: leaves a title that recovers at the next start', async () => {
		const movie = await seedMovie(api, 3007, 'Interrupted');
		await addValidVideo(api, movie);
		await holdFfmpeg(api, movie);
		await owner.get(`/transcode/request/${movie.id}`);
		await waitForHeldRun(api, movie);

		await api.killWorkers();
		expect((await metadataOf(owner, movie)).transcodeStatus).toBe('in progress');
		await releaseFfmpeg(api, movie);
		await api.startWorker();

		await api.waitFor(async () => expect((await metadataOf(owner, movie)).transcodeStatus).toBe('ready'));
		expect(jobRow(api, movie)?.attempts).toBe(2);
	});

	it('never makes partial output ready, and removes it', async () => {
		const movie = await seedMovie(api, 3201, 'Partial');
		await addHoldableVideo(api, movie);
		await owner.get(`/transcode/request/${movie.id}`);
		await waitForHeldRun(api, movie);

		await api.killWorkers();

		// The run wrote a whole playlist, so nothing may find it in the cache.
		expect(await cacheEntries(api)).not.toContain(String(movie.id));
		expect(await (await owner.get(`/transcode/request/${movie.id}`)).json()).toEqual({ status: 'in progress' });
		expect((await owner.get(`/transcode/playlist/${movie.id}`)).status).toBe(404);
		expect((await owner.get(`/streams/${movie.id}/playlist.m3u8`)).status).toBe(404);

		await api.startWorker();

		await waitForHeldRun(api, movie, 2);
		expect(await cacheEntries(api)).not.toContain(`${movie.id}.partial-1`);
		expect((await metadataOf(owner, movie)).transcodeStatus).toBe('in progress');

		await releaseFfmpeg(api, movie);
		await api.waitFor(async () => expect((await metadataOf(owner, movie)).transcodeStatus).toBe('ready'));
		expect(await cacheEntries(api)).not.toContain(`${movie.id}.partial-2`);
	});

	it('fails a job that keeps taking the worker down', async () => {
		const movie = await seedMovie(api, 3202, 'Poison');
		await addHoldableVideo(api, movie);
		await owner.get(`/transcode/request/${movie.id}`);

		for (const attempt of [1, 2, 3]) {
			await waitForHeldRun(api, movie, attempt);
			await api.killWorkers();
			await api.startWorker();
		}

		await api.waitFor(async () => expect((await metadataOf(owner, movie)).transcodeStatus).toBe('failed'));
		expect((await metadataOf(owner, movie)).transcodeError).toBe('The worker stopped during all 3 attempts at this job.');
		expect(await cacheEntries(api)).not.toContain(`${movie.id}.partial-3`);
	});
});

describe('a clean shutdown', () => {
	let api: TestApi;
	let owner: TestClient;

	beforeAll(async () => {
		api = await startApi();
		owner = await api.createOwner();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('stops ffmpeg, removes its output and requeues the job without counting the run', async () => {
		const movie = await seedMovie(api, 3301, 'Shut Down');
		await addHoldableVideo(api, movie);
		await owner.get(`/transcode/request/${movie.id}`);
		await waitForHeldRun(api, movie);

		expect(await api.stopWorkers()).toEqual([0]);

		expect(await ffmpegWasStopped(api, movie)).toBe(true);
		expect(jobRow(api, movie)).toMatchObject({ status: 'queued', attempts: 0, error: null });
		expect(await cacheEntries(api)).toEqual([]);

		await api.startWorker();
		await waitForHeldRun(api, movie, 2);
		await releaseFfmpeg(api, movie);
		await api.waitFor(async () => expect((await metadataOf(owner, movie)).transcodeStatus).toBe('ready'));
	});
});

describe('the concurrency limit', () => {
	let api: TestApi;

	afterAll(async () => {
		await api?.stop();
	});

	const queueHeldMovies = async (owner: TestClient, ids: number[]) => {
		const movies = await Promise.all(ids.map((id) => seedMovie(api, id, `Movie ${id}`)));
		for (const movie of movies) {
			await addHoldableVideo(api, movie);
			await owner.get(`/transcode/request/${movie.id}`);
		}
		return movies;
	};

	const statuses = (movies: SeededMovie[]) => movies.map((movie) => jobRow(api, movie)?.status);

	it('defaults to one job at a time', async () => {
		api = await startApi();
		const owner = await api.createOwner();
		const [first, second] = (await queueHeldMovies(owner, [3401, 3402])) as [SeededMovie, SeededMovie];

		await waitForHeldRun(api, first);
		await new Promise((resolve) => setTimeout(resolve, 600));
		expect(statuses([first, second])).toEqual(['running', 'queued']);

		await releaseFfmpeg(api, first);

		await waitForHeldRun(api, second);
		expect(statuses([first, second])).toEqual(['done', 'running']);
		await api.stop();
	});

	it('follows JOB_CONCURRENCY', async () => {
		api = await startApi({ jobConcurrency: 2 });
		const owner = await api.createOwner();
		const movies = await queueHeldMovies(owner, [3411, 3412, 3413]);

		await api.waitFor(async () => expect(statuses(movies)).toEqual(['running', 'running', 'queued']));
		await new Promise((resolve) => setTimeout(resolve, 600));
		expect(statuses(movies)).toEqual(['running', 'running', 'queued']);
	});
});

describe.skipIf(!hasFfmpeg)('two workers on one database', () => {
	let api: TestApi;

	beforeAll(async () => {
		api = await startApi();
		await api.startWorker();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('run each job once', async () => {
		const owner = await api.createOwner();
		const ids = [3501, 3502, 3503, 3504, 3505, 3506, 3507, 3508];
		const movies = await Promise.all(ids.map((id) => seedMovie(api, id, `Movie ${id}`)));
		await Promise.all(movies.map((movie) => addCorruptVideo(api, movie)));

		await Promise.all(movies.map((movie) => owner.get(`/transcode/request/${movie.id}`)));

		await api.waitFor(async () => {
			expect(movies.map((movie) => jobRow(api, movie))).toEqual(
				movies.map(() => expect.objectContaining({ status: 'failed', attempts: 1 })),
			);
		}, 25_000);
		const lines = api.workerStdout().trimEnd().split('\n').map((line) => JSON.parse(line));
		const starts = lines.filter(({ message, jobType }) => message === 'Started job' && jobType === 'transcode');
		expect(starts).toHaveLength(ids.length);
	});
});
