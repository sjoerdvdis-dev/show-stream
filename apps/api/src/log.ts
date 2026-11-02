import morgan from 'morgan';
import { createLogger, type Logger } from '@workspace/logger';
import { config } from './config';

export const logger: Logger = createLogger(config.logLevel);

/**
 * HTTP Logger Middleware
 * -> Morgan middleware that logs HTTP
 */
export const createLoggerMiddleware = (logger: Logger) => {
	const stream = {
		write: (message: string) => logger.http(message.split('\n')[0]?.trimEnd() ?? ''),
	};

	return morgan('tiny', { stream });
};
