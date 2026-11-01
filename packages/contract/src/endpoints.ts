import { z } from 'zod';
import {
	authenticateResponseSchema,
	loginResponseSchema,
	movieResponseSchema,
	moviesResponseSchema,
	registerResponseSchema,
	showsResponseSchema,
	transcodePlaylistResponseSchema,
	transcodeRequestResponseSchema,
} from './api-types.js';

export type Endpoint = {
	method: 'GET' | 'POST';
	/** Express-style path. `:name` segments are filled from `params`. */
	path: string;
	/** Parses the path segments, which always arrive as strings. */
	params?: z.ZodType;
	body?: z.ZodType;
	/** Status of a successful response. Defaults to 200. */
	status?: number;
	/** How a successful response is sent. Defaults to `json`. */
	format?: 'json' | 'text' | 'file';
	response: z.ZodType;
};

const nonEmptyText = (label: string) => {
	const error = `${label} must be non-empty text`;
	return z.string({ error }).min(1, error);
};

const idSchema = z
	.string()
	.regex(/^\d{1,15}$/, 'Must be a whole number')
	.transform(Number);

const titleParams = z.object({ id: idSchema });

const streamParams = z.object({
	id: idSchema,
	file: z.string().regex(/^[\w-]+\.(m3u8|ts)$/, 'Must be an HLS file name'),
});

const credentials = z.object({ username: nonEmptyText('Username'), password: nonEmptyText('Password') });

/** Every route of the API. The API serves exactly these, and the typed client calls them. */
export const endpoints = {
	register: {
		method: 'POST',
		path: '/register',
		body: credentials,
		status: 201,
		response: registerResponseSchema,
	},
	login: { method: 'POST', path: '/login', body: credentials, response: loginResponseSchema },
	authenticate: {
		method: 'POST',
		path: '/authenticate',
		body: z.object({ token: nonEmptyText('Token') }),
		response: authenticateResponseSchema,
	},
	scan: { method: 'GET', path: '/scan', format: 'text', response: z.string() },
	transcodeRequest: {
		method: 'GET',
		path: '/transcode/request/:id',
		params: titleParams,
		response: transcodeRequestResponseSchema,
	},
	transcodePlaylist: {
		method: 'GET',
		path: '/transcode/playlist/:id',
		params: titleParams,
		response: transcodePlaylistResponseSchema,
	},
	stream: {
		method: 'GET',
		path: '/streams/:id/:file',
		params: streamParams,
		format: 'file',
		response: z.instanceof(Blob),
	},
	movies: { method: 'GET', path: '/movies', response: moviesResponseSchema },
	shows: { method: 'GET', path: '/shows', response: showsResponseSchema },
	movie: { method: 'GET', path: '/movie/:id', params: titleParams, response: movieResponseSchema },
} as const satisfies Record<string, Endpoint>;

export type Endpoints = typeof endpoints;
export type EndpointName = keyof Endpoints;

/** The parsed path params of an endpoint, or `undefined` if it has none. */
export type EndpointParams<E extends Endpoint> = E extends { params: z.ZodType } ? z.output<E['params']> : undefined;

/** The parsed body of an endpoint, or `undefined` if it has none. */
export type EndpointBody<E extends Endpoint> = E extends { body: z.ZodType } ? z.output<E['body']> : undefined;

export type EndpointResponse<E extends Endpoint> = z.output<E['response']>;
