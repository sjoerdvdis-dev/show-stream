import winston from 'winston';
import morgan from 'morgan';
import path from 'path';

/**
 * Winston Logger
 * -> Logs to error / combined files
 * -> Logs to console
 */
export const createLogger = () => {
	const logger = winston.createLogger({
		levels: {
			error: 0,
			warn: 1,
			security: 2,
			info: 3,
			http: 4,
			debug: 5,
		},
		format: winston.format.json(),
		transports: [
			new winston.transports.File({ filename: path.resolve(__dirname, '../logs/error.log'), level: 'error' }),
			new winston.transports.File({ filename: path.resolve(__dirname, '../logs/combined.log'), level: 'http' }),
			new winston.transports.Console({ format: winston.format.simple(), level: 'debug' }),
		],
	});
	return logger;
};

/**
 * HTTP Logger Middleware
 * -> Morgan middleware that logs HTTP
 */
export const createLoggerMiddleware = (logger: winston.Logger) => {
	const stream = {
		write: (message: string) => logger.http(message.split('\n')[0]?.trimEnd()),
	};

	return morgan('tiny', { stream });
};
