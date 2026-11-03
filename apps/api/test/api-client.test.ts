import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApiError, createApiClient, type ApiClient } from '@workspace/api-client';
import { ownerCredentials, startApi, type TestApi, type TestClient } from './support/api';
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
	let owner: TestClient;
	let client: ApiClient;
	let anonymous: ApiClient;
	let movie: SeededMovie;

	const clientOf = ({ cookie }: TestClient) => createApiClient(api.url, { headers: { cookie } });

	beforeAll(async () => {
		api = await startApi();
		owner = await api.createOwner();
		client = clientOf(owner);
		anonymous = createApiClient(api.url);
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

	it('lists a page of the library, with no query', async () => {
		const page = await client.libraryMovies();

		expect(page).toMatchObject({ total: 1, page: 1, pageSize: 24 });
		expect(page.items[0]).toMatchObject({ id: movie.id, title: 'Client Movie', status: 'not ready' });
	});

	it('sends a query, with lists, numbers and zero', async () => {
		await seedMovie(api, 4003, 'Client Drama', { genres: [{ id: 18, name: 'Drama' }], vote_average: 0 });
		await seedMovie(api, 4004, 'Client Comedy', { genres: [{ id: 35, name: 'Comedy' }], vote_average: 9 });

		const page = await client.libraryMovies({
			query: { q: 'client', genre: ['Drama', 'Comedy'], ratingMax: 0, sort: 'rating', order: 'desc', pageSize: 5 },
		});

		expect(page.items.map(({ title }) => title)).toEqual(['Client Drama']);
		expect(page).toMatchObject({ total: 1, pageSize: 5 });
	});

	it('reports a query the API refuses, with its details', async () => {
		const error = await failureOf(client.libraryMovies({ query: { pageSize: 500 } }));

		expect(error).toMatchObject({ status: 400, code: 'invalid_request' });
		expect(error.details).toEqual([{ path: 'pageSize', message: 'Page size must be at most 100' }]);
	});

	it('reads the facets', async () => {
		const facets = await client.libraryMovieFacets();

		expect(facets.statuses['not ready']).toBeGreaterThan(0);
	});

	it('lists shows', async () => {
		expect(await client.shows()).toEqual({ shows: [] });
	});

	it('gets a movie, with its TMDB data untouched', async () => {
		const { metadata } = await client.movie({ params: { id: movie.id } });

		expect(metadata.details).toEqual({ id: movie.id, title: 'Client Movie', release_date: '2024-01-01' });
		expect(metadata.credits).toEqual({ cast: [], crew: [] });
	});

	it('reports that setup is done', async () => {
		expect(await anonymous.setupStatus()).toEqual({ needed: false });
	});

	it('refuses a second setup', async () => {
		const error = await failureOf(anonymous.setup({ body: ownerCredentials }));

		expect(error).toMatchObject({ status: 409, code: 'conflict' });
	});

	it('logs in, reads the user and logs out', async () => {
		const { user } = await anonymous.login({ body: ownerCredentials });
		expect(user).toMatchObject({ username: 'owner', role: 'owner' });

		const session = clientOf(await api.logIn(ownerCredentials.username, ownerCredentials.password));
		expect((await session.me()).user.username).toBe('owner');
		expect(await session.logout()).toEqual({ success: true });

		expect(await failureOf(session.me())).toMatchObject({ status: 401, code: 'unauthorized' });
	});

	it('reports a missing session as its typed error', async () => {
		const error = await failureOf(anonymous.movies());

		expect(error).toMatchObject({ status: 401, code: 'unauthorized', message: 'You are not logged in' });
	});

	it('starts a scan, and reads it back', async () => {
		const { scan } = await client.scan();

		expect(scan?.status).toBe('queued');
		expect((await client.scanStatus()).scan?.time).toBe(scan?.time);
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
		const error = await failureOf(anonymous.login({ body: { username: '', password: 'x' } }));

		expect(error).toMatchObject({ status: 400, code: 'invalid_request' });
		expect(error.details).toEqual([{ path: 'username', message: 'Username must be non-empty text' }]);
	});

	it('reports a wrong password', async () => {
		const error = await failureOf(anonymous.login({ body: { username: 'owner', password: 'wrong' } }));

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
