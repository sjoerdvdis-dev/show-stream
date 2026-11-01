import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from 'winston';
import type { ApiErrorBody, ApiErrorCode, ApiErrorDetail } from '@workspace/contract/errors';

const statusOfCode: Record<ApiErrorCode, number> = {
	invalid_request: 400,
	unauthorized: 401,
	not_found: 404,
	internal_error: 500,
};

/** A failure meant for the client. Anything else that is thrown is unexpected. */
export class ApiFailure extends Error {
	constructor(
		readonly code: ApiErrorCode,
		message: string,
		readonly details?: ApiErrorDetail[],
	) {
		super(message);
	}
}

export const notFound = (what: string) => new ApiFailure('not_found', `${what} not found`);

/** Express and its body parsers raise errors with a 4xx `status` for requests they cannot read. */
const clientErrorStatus = (error: unknown) => {
	const status = (error as { status?: unknown } | null)?.status;
	return typeof status === 'number' && status >= 400 && status < 500 ? status : undefined;
};

export const unknownRouteHandler: RequestHandler = () => {
	throw notFound('Route');
};

/** The one place that turns a failure into a response. */
export const createErrorHandler =
	(logger: Logger): ErrorRequestHandler =>
	(error, req, res, next) => {
		const failure = { method: req.method, path: req.path };

		if (res.headersSent) {
			logger.error('Response failed after it started', { ...failure, stack: error?.stack });
			next(error);
			return;
		}

		const send = (status: number, body: ApiErrorBody) => {
			res.status(status).json(body);
		};

		if (error instanceof ApiFailure) {
			if (error.code === 'invalid_request') {
				logger.log('security', 'Rejected a malformed request', failure);
			}
			send(statusOfCode[error.code], { code: error.code, message: error.message, details: error.details });
			return;
		}

		const status = clientErrorStatus(error);
		if (status) {
			logger.log('security', 'Rejected an unreadable request', failure);
			send(status, { code: 'invalid_request', message: 'The request could not be read' });
			return;
		}

		logger.error('Unexpected failure', { ...failure, stack: error?.stack ?? String(error) });
		send(500, { code: 'internal_error', message: 'Something went wrong' });
	};
