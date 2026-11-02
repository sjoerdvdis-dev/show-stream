import cors from 'cors';
import helmet from 'helmet';
import express, { type RequestHandler } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { findSessionOfHandshake, isCrossSite } from './auth';
import { createLoggerMiddleware } from './log';
import { config } from './config';
import { ApiFailure, createErrorHandler, unknownRouteHandler } from './errors';
import { bindRoutes, type Handlers } from './routes';
import type { Logger } from '@workspace/logger';

const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

const refuseCrossSiteRequests: RequestHandler = (req, _res, next) => {
	if (!safeMethods.includes(req.method) && isCrossSite(req.headers)) {
		throw new ApiFailure('forbidden', 'Requests from other sites are not allowed');
	}
	next();
};

/**
 * The Express app stays private to this function, so that a route can only exist as an
 * endpoint in the contract, and so gets its auth, validation and error handling from `bindRoutes`.
 */
export const createServer = (handlers: Handlers, logger: Logger): { httpServer: http.Server; io: SocketIOServer } => {
	const app = express();

	// One proxy sits in front of the API, and only its entry in X-Forwarded-For can be trusted.
	app.set('trust proxy', 1);

	app
		.use(
			cors({
				origin: [config.nextClientUrl],
				credentials: true,
			}),
		)
		.use(createLoggerMiddleware(logger))
		// After HSTS a browser offers no way past an untrusted certificate, which an internal CA install needs.
		.use(helmet({ strictTransportSecurity: false }))
		.use(refuseCrossSiteRequests)
		.use(express.json())
		.use(express.urlencoded({ extended: true }));

	bindRoutes(app, handlers);

	app.use(unknownRouteHandler).use(createErrorHandler(logger));

	const httpServer = http.createServer(app);
	const io = new SocketIOServer(httpServer, {
		path: '/socket',
		allowRequest: (req, callback) => {
			const crossSite = isCrossSite(req.headers);
			callback(crossSite ? 'Connections from other sites are not allowed' : null, !crossSite);
		},
	});

	// Refused here rather than in `allowRequest`, because a client does not retry this answer.
	io.use((socket, next) => {
		const session = findSessionOfHandshake(socket.request.headers);
		if (!session) {
			next(new Error('unauthorized'));
			return;
		}
		socket.data.session = session;
		next();
	});

	return { httpServer, io };
};
