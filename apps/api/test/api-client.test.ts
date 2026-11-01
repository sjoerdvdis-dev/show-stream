import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApiError, createApiClient, type ApiClient } from '@workspace/api-client';
import { startApi, type TestApi } from './support/api';
import { addValidVideo, hasFfmpeg } from './support/ffmpeg';
import { seedMovie, type SeededMovie } from './support/seed';

const failureOf = async (call: Promise<unknown>) => {
	const error = await call.then(
		() => undefined,
		(reason: unknown) => reason,
	);
	expect(error).toBeInstanceOf(ApiError);
	return error as ApiError;
};

// The client parses every success against its schema, so a call that resolves proves the body.
describe('the typed client against the real API', () => {
	let api: TestApi;
	let client: ApiClient;
	let movie: SeededMovie;

	beforeAll(async () => {
		api = await startApi();
		client = createApiClient(api.url);
		movie = await seedMovie(api, 4001, 'Client Movie');
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('lists movies', async () => {
		const { movies } = await client.movies();

		expect(movies).toHaveLength(1);
		expect(movies[0]?.details.title).toBe('Client Movie');
		expect(movies[0]?.transcodeStatus).toBe('not ready');
	});

	it('lists shows', async () => {
		expect(await client.shows()).toEqual({ shows: [] });
	});

	it('gets a movie, with its TMDB data untouched', async () => {
		const { metadata } = await client.movie({ params: { id: movie.id } });

		expect(metadata.details).toEqual({ id: movie.id, title: 'Client Movie', release_date: '2024-01-01' });
		expect(metadata.credits).toEqual({ cast: [], crew: [] });
	});

	it('registers, logs in and authenticates', async () => {
		const credentials = { username: 'client-user', password: 'correct horse' };

		expect(await client.register({ body: credentials })).toEqual({ success: true });
		const { token } = await client.login({ body: credentials });
		const { user, valid } = await client.authenticate({ body: { token } });

		expect(valid).toBe(true);
		expect(user.username).toBe('client-user');
	});

	it('scans', async () => {
		expect(await client.scan()).toBe('Successfully scanned media folder');
	});

	it('has no playlist for a movie that is not ready', async () => {
		const error = await failureOf(client.transcodePlaylist({ params: { id: movie.id } }));

		expect(error).toMatchObject({ status: 404, code: 'not_found' });
	});

	it.runIf(hasFfmpeg)('requests a transcode, finds its playlist and streams it', async () => {
		const playable = await seedMovie(api, 4002, 'Client Playable');
		await addValidVideo(api, playable);

		const { status } = await client.transcodeRequest({ params: { id: playable.id } });
		expect(status).toBe('in progress');

		await api.waitFor(async () => {
			const { metadata } = await client.movie({ params: { id: playable.id } });
			expect(metadata.transcodeStatus).toBe('ready');
		});

		const { playlistUrl } = await client.transcodePlaylist({ params: { id: playable.id } });
		expect(playlistUrl).toBe(`/streams/${playable.id}/playlist.m3u8`);

		const playlist = await client.stream({ params: { id: playable.id, file: 'playlist.m3u8' } });
		expect(await playlist.text()).toContain('#EXTM3U');
	});

	it('throws one error type with the code and message of the API', async () => {
		const error = await failureOf(client.movie({ params: { id: 9999 } }));

		expect(error).toMatchObject({ status: 404, code: 'not_found', message: 'Movie not found' });
	});

	it('carries field details', async () => {
		const error = await failureOf(client.login({ body: { username: '', password: 'x' } }));

		expect(error).toMatchObject({ status: 400, code: 'invalid_request' });
		expect(error.details).toEqual([{ path: 'username', message: 'Username must be non-empty text' }]);
	});

	it('reports a wrong password', async () => {
		const error = await failureOf(client.login({ body: { username: 'admin', password: 'wrong' } }));

		expect(error).toMatchObject({ status: 401, code: 'unauthorized' });
	});

	it('encodes path values', async () => {
		const error = await failureOf(client.stream({ params: { id: movie.id, file: '../secret.ts' } }));

		expect(error).toMatchObject({ status: 400, code: 'invalid_request' });
	});

	it('reports a server it cannot reach', async () => {
		const error = await failureOf(createApiClient('http://127.0.0.1:9').movies());

		expect(error).toMatchObject({ status: 0, code: 'network_error' });
	});
});
