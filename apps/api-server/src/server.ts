import cors from 'cors';
import helmet from 'helmet';
import express, { type Express } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createLogger, createLoggerMiddleware } from './log';
import type { Logger } from 'winston';

export const createServer = (): { httpServer: http.Server; io: SocketIOServer; app: Express; logger: Logger } => {
	const app = express();
	const logger = createLogger();

	const NEXT_CLIENT_URL = process.env.NEXT_CLIENT_URL || '';

	app
		.use(
			cors({
				origin: [NEXT_CLIENT_URL],
				credentials: true,
			}),
		)
		.use(createLoggerMiddleware(logger))
		.use(helmet())
		.use(express.json())
		.use(express.urlencoded({ extended: true }));

	const httpServer = http.createServer(app);
	const io = new SocketIOServer(httpServer, {
		path: '/socket',
	});

	return { httpServer, io, app, logger };
};
