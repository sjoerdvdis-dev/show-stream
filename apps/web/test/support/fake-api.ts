import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer();

const owner = { userId: '1', username: 'owner', role: 'owner' };
const password = 'correct horse battery';

const unauthorized = (message = 'Log in first') =>
	HttpResponse.json({ code: 'unauthorized', message }, { status: 401 });

/** What the API knows. A test changes this, as another tab or an expired session would. */
export type FakeApi = {
	setupNeeded: boolean;
	signedIn: boolean;
	movies: { id: number; title: string }[];
	/** Keeps `/movies` waiting, so that a test can see what shows until it answers. */
	moviesDelayMs: number;
	rateLimited: boolean;
};

/** A small API that answers as the real one does. `apps/api/test` proves the real one. */
export const startFakeApi = (state: Partial<FakeApi> = {}) => {
	const api: FakeApi = {
		setupNeeded: false,
		signedIn: false,
		movies: [],
		moviesDelayMs: 0,
		rateLimited: false,
		...state,
	};

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
			return HttpResponse.json({ user: owner });
		}),
		http.post('/api/auth/logout', () => {
			if (!api.signedIn) return unauthorized();
			api.signedIn = false;
			return HttpResponse.json({ success: true });
		}),
		http.get('/api/auth/me', () => (api.signedIn ? HttpResponse.json({ user: owner }) : unauthorized())),
		http.get('/api/movies', async () => {
			await delay(api.moviesDelayMs);
			if (!api.signedIn) return unauthorized();
			return HttpResponse.json({
				movies: api.movies.map((details) => ({ details, credits: {}, images: {}, transcodeStatus: 'ready' })),
			});
		}),
		http.get('/api/transcode/playlist/:id', ({ params }) => {
			if (!api.signedIn) return unauthorized();
			if (params.id === '404') {
				return HttpResponse.json({ code: 'not_found', message: 'Transcoding not found' }, { status: 404 });
			}
			return HttpResponse.json({ playlistUrl: `/streams/${String(params.id)}/playlist.m3u8` });
		}),
	);

	return api;
};

export const correctPassword = password;
