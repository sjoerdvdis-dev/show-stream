import type { Express, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import {
	endpoints,
	type Endpoint,
	type EndpointBody,
	type EndpointName,
	type EndpointParams,
	type EndpointQuery,
	type EndpointResponse,
	type Endpoints,
} from '@workspace/contract/endpoints';
import type { ApiErrorDetail } from '@workspace/contract/errors';
import { findSessionOfRequest, isAdmin, passwordAttemptLimit, type Session } from './auth';
import { ApiFailure } from './errors';

type Handler<E extends Endpoint> = (
	input: {
		params: EndpointParams<E>;
		query: EndpointQuery<E>;
		body: EndpointBody<E>;
		session: E extends { access: 'public' } ? undefined : Session;
	},
	/** For endpoints that set a cookie, and those with the `file` format, which send the response themselves. */
	res: Response,
) => Promise<E extends { format: 'file' } ? void : EndpointResponse<E>>;

/** One handler per endpoint in the contract. The compiler rejects a missing or an extra one. */
export type Handlers = { [Name in EndpointName]: Handler<Endpoints[Name]> };

const toDetails = (error: z.ZodError): ApiErrorDetail[] =>
	error.issues.map(({ path, message }) => ({ path: path.join('.'), message }));

const parse = (schema: z.ZodType | undefined, value: unknown) => {
	if (!schema) {
		return undefined;
	}
	const result = schema.safeParse(value);
	if (!result.success) {
		throw new ApiFailure('invalid_request', 'The request is invalid', toDetails(result.error));
	}
	return result.data;
};

/**
 * The only auth check, so that no handler can skip it or get it wrong. It runs before
 * validation, so that a request with no session learns nothing about a route's input.
 */
const authorize = (endpoint: Endpoint, req: Request, res: Response) => {
	if (endpoint.access === 'public') {
		return undefined;
	}
	const session = findSessionOfRequest(req, res);
	if (!session) {
		throw new ApiFailure('unauthorized', 'You are not logged in');
	}
	if (endpoint.access === 'admin' && !isAdmin(session)) {
		throw new ApiFailure('forbidden', 'Only an admin can do this');
	}
	return session;
};

const bindRoute = (app: Express, endpoint: Endpoint, handler: (input: unknown, res: Response) => Promise<unknown>) => {
	const route = async (req: Request, res: Response) => {
		const session = authorize(endpoint, req, res);
		const input = {
			params: parse(endpoint.params, req.params),
			query: parse(endpoint.query, req.query),
			body: parse(endpoint.body, req.body ?? {}),
			session,
		};
		const result = await handler(input, res);

		if (endpoint.format === 'file') {
			return;
		}
		res.status(endpoint.status ?? 200);
		if (endpoint.format === 'text') {
			res.send(result);
		} else {
			res.json(result);
		}
	};

	const limits: RequestHandler[] = endpoint.rateLimited ? [passwordAttemptLimit] : [];

	if (endpoint.method === 'GET') {
		app.get(endpoint.path, ...limits, route);
	} else {
		app.post(endpoint.path, ...limits, route);
	}
};

/** Serves every endpoint in the contract. Requests are authorized and validated before their handler runs. */
export const bindRoutes = (app: Express, handlers: Handlers) => {
	for (const name of Object.keys(endpoints) as EndpointName[]) {
		bindRoute(app, endpoints[name], handlers[name] as (input: unknown, res: Response) => Promise<unknown>);
	}
};
