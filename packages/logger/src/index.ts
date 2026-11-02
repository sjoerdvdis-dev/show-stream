import winston from 'winston';

/** Most urgent first. A `LOG_LEVEL` keeps its own level and everything before it. */
export const logLevels = ['error', 'warn', 'security', 'info', 'http', 'debug'] as const;

export type LogLevel = (typeof logLevels)[number];

export type Logger = winston.Logger;

/** An `Error` has no enumerable fields, so JSON would print it as `{}`. */
const plainErrors = winston.format((info) => {
	for (const [key, value] of Object.entries(info)) {
		if (value instanceof Error) {
			info[key] = { message: value.message, stack: value.stack };
		}
	}
	return info;
});

/** One JSON object per line on stdout, and no files, so that Docker keeps and rotates the logs. */
export const createLogger = (level: LogLevel): Logger =>
	winston.createLogger({
		levels: Object.fromEntries(logLevels.map((name, urgency) => [name, urgency])),
		level,
		format: winston.format.combine(plainErrors(), winston.format.timestamp(), winston.format.json()),
		transports: [new winston.transports.Console()],
	});
