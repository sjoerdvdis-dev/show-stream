import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import {
	endpoints,
	type Endpoint,
	type EndpointBody,
	type EndpointName,
	type EndpointParams,
	type EndpointResponse,
	type Endpoints,
} from '@workspace/contract/endpoints';
import type { ApiErrorDetail } from '@workspace/contract/errors';
import { ApiFailure } from './errors';

type Handler<E extends Endpoint> = (
	input: { params: EndpointParams<E>; body: EndpointBody<E> },
	/** Only for endpoints with the `file` format, whose handler sends the response itself. */
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

const bindRoute = (app: Express, endpoint: Endpoint, handler: (input: unknown, res: Response) => Promise<unknown>) => {
	const route = async (req: Request, res: Response) => {
		const input = { params: parse(endpoint.params, req.params), body: parse(endpoint.body, req.body ?? {}) };
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

	if (endpoint.method === 'GET') {
		app.get(endpoint.path, route);
	} else {
		app.post(endpoint.path, route);
	}
};

/** Serves every endpoint in the contract. Requests are validated before their handler runs. */
export const bindRoutes = (app: Express, handlers: Handlers) => {
	for (const name of Object.keys(endpoints) as EndpointName[]) {
		bindRoute(app, endpoints[name], handlers[name] as (input: unknown, res: Response) => Promise<unknown>);
	}
};
