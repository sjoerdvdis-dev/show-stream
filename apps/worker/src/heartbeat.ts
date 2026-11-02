import { writeFileSync } from 'node:fs';

/** Far shorter than the age the Compose health check allows. */
const beatIntervalMs = 5_000;

/**
 * Tells the health check that the job loop still turns, by keeping `file` young. Without a file,
 * as under `pnpm dev`, it does nothing. Call it as often as you like: it writes only now and then.
 */
export const createHeartbeat = (file: string | undefined) => {
	let lastBeat = 0;

	return () => {
		const now = Date.now();
		if (file && now - lastBeat >= beatIntervalMs) {
			writeFileSync(file, `${now}\n`);
			lastBeat = now;
		}
	};
};
