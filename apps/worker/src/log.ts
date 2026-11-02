import { createLogger, type Logger } from '@workspace/logger';
import { config } from './config';

export const logger: Logger = createLogger(config.logLevel);
