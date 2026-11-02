import { describe, expect, it } from 'vitest';
import { createLogger, logLevels } from '../src/index';

const formatted = Symbol.for('message');

/** What the logger would print for this entry. */
const line = (entry: Record<string, unknown>) => {
	const info = createLogger('debug').format.transform({ level: 'info', message: 'Hello', ...entry });
	return JSON.parse((info as unknown as Record<symbol, string>)[formatted]!);
};

describe('the logger', () => {
	it('prints JSON with a level, a message, a timestamp and any fields', () => {
		expect(line({ jobId: 7 })).toEqual({
			level: 'info',
			message: 'Hello',
			jobId: 7,
			timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
		});
	});

	it('keeps the message and stack of an Error', () => {
		const error = new Error('The disk is full');

		expect(line({ error }).error).toEqual({ message: 'The disk is full', stack: error.stack });
	});

	it.each([
		['error', ['error']],
		['info', ['error', 'warn', 'security', 'info']],
		['debug', ['error', 'warn', 'security', 'info', 'http', 'debug']],
	] as const)('at %s keeps only %j', (level, kept) => {
		const logger = createLogger(level);

		expect(logLevels.filter((name) => logger.isLevelEnabled(name))).toEqual(kept);
	});
});
