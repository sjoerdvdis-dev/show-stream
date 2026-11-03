import type { TranscodeStatus } from '@workspace/contract/api-types';
import { endpoints } from '@workspace/contract/endpoints';
import type { LibraryItem } from '@workspace/contract/library';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer();

const owner = { userId: '1', username: 'owner', role: 'owner' };
const password = 'correct horse battery';

const unauthorized = (message = 'Log in first') =>
	HttpResponse.json({ code: 'unauthorized', message }, { status: 401 });

const notFound = (message: string) => HttpResponse.json({ code: 'not_found', message }, { status: 404 });

const serverError = () =>
	HttpResponse.json({ code: 'internal_error', message: 'Something went wrong' }, { status: 500 });

/** A movie as the fake knows it. Only `id` and `title` are needed. */
export type FakeMovie = Partial<Omit<LibraryItem, 'id' | 'title'>> & {
	id: number;
	title: string;
	/** Why preparing it failed, when `status` is `failed`. */
	failureReason?: string;
	overview?: string;
	tagline?: string;
	/** What Play answers, when the card is out of date. Without it, Play answers from `status`. */
	playAnswer?: TranscodeStatus;
};

/** What the API knows. A test changes this, as another tab or an expired session would. */
export type FakeApi = {
	setupNeeded: boolean;
	signedIn: boolean;
	role: 'owner' | 'admin' | 'user';
	movies: FakeMovie[];
	/** Keeps the library waiting, so that a test can see what shows until it answers. */
	moviesDelayMs: number;
	/** The library and a movie's page answer 500. */
	libraryFails: boolean;
	/** The facets answer 500. */
	facetsFail: boolean;
	rateLimited: boolean;
	/** How many times each title was asked to play, by ID. */
	playRequests: Map<number, number>;
};

const toItem = (movie: FakeMovie): LibraryItem => ({
	year: null,
	releaseDate: null,
	runtime: null,
	rating: null,
	genres: [],
	status: 'not ready',
	hasPoster: false,
	hasBackdrop: false,
	...movie,
});

const range = (values: (number | string | null)[]) => {
	const present = values.filter((value) => value !== null).sort();
	return present.length > 0 ? { min: present[0]!, max: present.at(-1)! } : null;
};

/**
 * A small API that answers as the real one does. `apps/api/test` proves the real one. The library
 * filters by search, genre, status and year, and sorts by title or year, which is enough to see
 * that the screen asked for what the URL says.
 */
export const startFakeApi = (state: Partial<FakeApi> = {}) => {
	const api: FakeApi = {
		setupNeeded: false,
		signedIn: false,
		role: 'owner',
		moviesDelayMs: 0,
		libraryFails: false,
		facetsFail: false,
		rateLimited: false,
		playRequests: new Map(),
		...state,
		// Copies, because the fake changes a movie's status as the API would.
		movies: (state.movies ?? []).map((movie) => ({ ...movie })),
	};

	const findMovie = (id: unknown) => api.movies.find((movie) => String(movie.id) === String(id));

	server.use(
		http.get('/api/auth/setup', () => HttpResponse.json({ needed: api.setupNeeded })),
		http.post('/api/auth/setup', () => {
			api.setupNeeded = false;
			api.signedIn = true;
			return HttpResponse.json({ user: owner }, { status: 201 });
		}),
		http.post('/api/auth/login', async ({ request }) => {
			if (api.rateLimited) {
				return HttpResponse.json(
					{ code: 'rate_limited', message: 'Too many attempts. Try again later' },
					{ status: 429 },
				);
			}
			const body = (await request.json()) as { password: string };
			if (body.password !== password) {
				return unauthorized('Invalid username or password');
			}
			api.signedIn = true;
			return HttpResponse.json({ user: { ...owner, role: api.role } });
		}),
		http.post('/api/auth/logout', () => {
			if (!api.signedIn) return unauthorized();
			api.signedIn = false;
			return HttpResponse.json({ success: true });
		}),
		http.get('/api/auth/me', () =>
			api.signedIn ? HttpResponse.json({ user: { ...owner, role: api.role } }) : unauthorized(),
		),
		http.get('/api/library/movies/facets', () => {
			if (!api.signedIn) return unauthorized();
			if (api.facetsFail) return serverError();
			const items = api.movies.map(toItem);
			const genres = [...new Set(items.flatMap((item) => item.genres))].sort();
			const statuses: Record<TranscodeStatus, number> = { 'not ready': 0, 'in progress': 0, ready: 0, failed: 0 };
			for (const item of items) statuses[item.status] += 1;
			return HttpResponse.json({
				year: range(items.map((item) => item.year)),
				releaseDate: range(items.map((item) => item.releaseDate)),
				runtime: range(items.map((item) => item.runtime)),
				rating: range(items.map((item) => item.rating)),
				genres: genres.map((name) => ({
					name,
					count: items.filter((item) => item.genres.includes(name)).length,
				})),
				statuses,
			});
		}),
		http.get('/api/library/movies', async ({ request }) => {
			await delay(api.moviesDelayMs);
			if (!api.signedIn) return unauthorized();
			if (api.libraryFails) return serverError();
			const params = new URL(request.url).searchParams;
			const raw = Object.fromEntries(
				[...new Set(params.keys())].map((key) => {
					const values = params.getAll(key);
					return [key, values.length > 1 ? values : values[0]];
				}),
			);
			const parsed = endpoints.libraryMovies.query.safeParse(raw);
			if (!parsed.success) {
				return HttpResponse.json({ code: 'invalid_request', message: 'Invalid query' }, { status: 400 });
			}
			const query = parsed.data;
			const words = query.q?.toLowerCase().split(/\s+/).filter(Boolean) ?? [];
			const matching = api.movies
				.map(toItem)
				.filter((item) => words.every((word) => item.title.toLowerCase().includes(word)))
				.filter((item) => !query.genre || query.genre.some((genre) => item.genres.includes(genre)))
				.filter((item) => !query.status || query.status.includes(item.status))
				.filter((item) => query.yearMin === undefined || (item.year ?? -1) >= query.yearMin)
				.filter((item) => query.yearMax === undefined || (item.year ?? Infinity) <= query.yearMax)
				.sort((a, b) => (query.sort === 'year' ? (a.year ?? 0) - (b.year ?? 0) : a.title.localeCompare(b.title)));
			if (query.order === 'desc') matching.reverse();
			const start = (query.page - 1) * query.pageSize;
			return HttpResponse.json({
				items: matching.slice(start, start + query.pageSize),
				total: matching.length,
				page: query.page,
				pageSize: query.pageSize,
			});
		}),
		http.get('/api/library/movies/:id/images/:kind', () => new HttpResponse(null, { status: 404 })),
		http.get('/api/movie/:id', async ({ params }) => {
			await delay(api.moviesDelayMs);
			if (!api.signedIn) return unauthorized();
			if (api.libraryFails) return serverError();
			const movie = findMovie(params.id);
			if (!movie) return notFound('Movie not found');
			const item = toItem(movie);
			return HttpResponse.json({
				metadata: {
					details: {
						id: item.id,
						title: item.title,
						overview: movie.overview ?? '',
						tagline: movie.tagline ?? '',
						release_date: item.releaseDate ?? '',
						runtime: item.runtime ?? 0,
						vote_average: item.rating ?? 0,
						genres: item.genres.map((name, index) => ({ id: index, name })),
					},
					credits: {},
					images: {},
					transcodeStatus: item.status,
					...(movie.failureReason ? { transcodeError: movie.failureReason } : {}),
				},
			});
		}),
		http.get('/api/transcode/request/:id', ({ params }) => {
			if (!api.signedIn) return unauthorized();
			const movie = findMovie(params.id);
			if (!movie) return notFound('Movie not found');
			api.playRequests.set(movie.id, (api.playRequests.get(movie.id) ?? 0) + 1);
			if (movie.playAnswer) return HttpResponse.json({ status: movie.playAnswer });
			const status = movie.status ?? 'not ready';
			if (status === 'failed') {
				return HttpResponse.json({ status, ...(movie.failureReason ? { error: movie.failureReason } : {}) });
			}
			if (status === 'not ready') {
				movie.status = 'in progress';
			}
			return HttpResponse.json({ status: movie.status });
		}),
		http.post('/api/transcode/retry/:id', ({ params }) => {
			if (!api.signedIn) return unauthorized();
			const movie = findMovie(params.id);
			if (!movie) return notFound('Movie not found');
			if (movie.status !== 'failed') {
				return HttpResponse.json(
					{ code: 'conflict', message: 'Only a failed transcode can be retried' },
					{ status: 409 },
				);
			}
			movie.status = 'in progress';
			delete movie.failureReason;
			return HttpResponse.json({ status: 'in progress' });
		}),
		http.get('/api/transcode/playlist/:id', ({ params }) => {
			if (!api.signedIn) return unauthorized();
			if (findMovie(params.id)?.status !== 'ready') {
				return HttpResponse.json({ code: 'not_found', message: 'Transcoding not found' }, { status: 404 });
			}
			return HttpResponse.json({ playlistUrl: `/streams/${String(params.id)}/playlist.m3u8` });
		}),
	);

	return api;
};

export const correctPassword = password;
