import {
	endpoints,
	type Endpoint,
	type EndpointBody,
	type EndpointName,
	type EndpointParams,
	type EndpointResponse,
	type Endpoints,
} from '@workspace/contract/endpoints';
import { apiErrorSchema, type ApiErrorCode, type ApiErrorDetail } from '@workspace/contract/errors';

/** The API's own codes, plus the failures that only a client can see. */
export type ApiClientErrorCode = ApiErrorCode | 'network_error' | 'invalid_response';

/** Thrown by every failed call. `status` is 0 if no response arrived. */
export class ApiError extends Error {
	override readonly name = 'ApiError';

	constructor(
		readonly status: number,
		readonly code: ApiClientErrorCode,
		message: string,
		readonly details?: ApiErrorDetail[],
		options?: ErrorOptions,
	) {
		super(message, options);
	}
}

type Input<E extends Endpoint> = (E extends { params: unknown } ? { params: EndpointParams<E> } : object) &
	(E extends { body: unknown } ? { body: EndpointBody<E> } : object);

type Call<E extends Endpoint> =
	E extends { params: unknown } | { body: unknown }
		? (input: Input<E>) => Promise<EndpointResponse<E>>
		: () => Promise<EndpointResponse<E>>;

export type ApiClient = { [Name in EndpointName]: Call<Endpoints[Name]> };

type LooseInput = { params?: Record<string, string | number>; body?: unknown };

const fillPath = (path: string, params: LooseInput['params'] = {}) =>
	path.replace(/:(\w+)/g, (_, name: string) => encodeURIComponent(String(params[name])));

const readBody = (response: Response, format: Endpoint['format']) => {
	if (format === 'text') return response.text();
	if (format === 'file') return response.blob();
	return response.json();
};

const toApiError = async (response: Response) => {
	const body = apiErrorSchema.safeParse(await response.json().catch(() => undefined));
	if (!body.success) {
		return new ApiError(response.status, 'invalid_response', `The server answered ${response.status}`);
	}
	const { code, message, details } = body.data;
	return new ApiError(response.status, code, message, details);
};

export type ApiClientOptions = {
	/** Sent with every call. A browser sends its cookie by itself, and anything else passes it here. */
	headers?: Record<string, string>;
};

/**
 * A typed client with one call per endpoint in the contract.
 *
 * @param baseUrl Prefix of every path, such as `https://media.example` or `/api`.
 */
export const createApiClient = (baseUrl: string, { headers }: ApiClientOptions = {}): ApiClient => {
	const root = baseUrl.replace(/\/$/, '');

	const call = async (endpoint: Endpoint, input: LooseInput = {}) => {
		const hasBody = input.body !== undefined;

		let response: Response;
		try {
			response = await fetch(`${root}${fillPath(endpoint.path, input.params)}`, {
				method: endpoint.method,
				credentials: 'include',
				headers: { ...headers, ...(hasBody ? { 'content-type': 'application/json' } : {}) },
				body: hasBody ? JSON.stringify(input.body) : undefined,
			});
		} catch (cause) {
			throw new ApiError(0, 'network_error', 'Could not reach the server', undefined, { cause });
		}

		if (!response.ok) {
			throw await toApiError(response);
		}

		let result;
		try {
			result = endpoint.response.safeParse(await readBody(response, endpoint.format));
		} catch (cause) {
			throw new ApiError(response.status, 'invalid_response', 'Could not read the response', undefined, { cause });
		}
		if (!result.success) {
			throw new ApiError(response.status, 'invalid_response', 'The response does not match the contract');
		}
		return result.data;
	};

	const calls = Object.entries(endpoints).map(([name, endpoint]) => [
		name,
		(input?: LooseInput) => call(endpoint, input),
	]);

	return Object.fromEntries(calls) as ApiClient;
};
