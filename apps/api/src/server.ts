import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createLoggerMiddleware } from './log';
import { config } from './config';
import { createErrorHandler, unknownRouteHandler } from './errors';
import { bindRoutes, type Handlers } from './routes';
import type { Logger } from 'winston';

/**
 * The Express app stays private to this function, so that a route can only exist as an
 * endpoint in the contract, and so gets its validation and error handling from `bindRoutes`.
 */
export const createServer = (handlers: Handlers, logger: Logger): { httpServer: http.Server; io: SocketIOServer } => {
	const app = express();

	app
		.use(
			cors({
				origin: [config.nextClientUrl],
				credentials: true,
			}),
		)
		.use(createLoggerMiddleware(logger))
		.use(helmet())
		.use(express.json())
		.use(express.urlencoded({ extended: true }));

	bindRoutes(app, handlers);

	app.use(unknownRouteHandler).use(createErrorHandler(logger));

	const httpServer = http.createServer(app);
	const io = new SocketIOServer(httpServer, {
		path: '/socket',
	});

	return { httpServer, io };
};
