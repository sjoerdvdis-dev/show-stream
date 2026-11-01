import { execFile, spawnSync } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type { TestApi } from './api';
import type { SeededMovie } from './seed';

const run = promisify(execFile);

/**
 * Whether the tests that run a real ffmpeg job can run. They skip locally when it is
 * missing, but a run in CI must never pass without them.
 */
export const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

if (!hasFfmpeg) {
	if (process.env.CI) {
		throw new Error('ffmpeg is required in CI. Install it before running the API tests.');
	}
	console.warn('Skipping tests that need ffmpeg, because it is not installed. scripts/setup.sh installs it.');
}

/** Generates a short valid H.264 clip in the movie's folder. */
export const addValidVideo = async (api: TestApi, movie: SeededMovie) => {
	await run('ffmpeg', [
		'-loglevel', 'error',
		'-f', 'lavfi',
		'-i', 'testsrc=duration=2:size=160x90:rate=10',
		'-c:v', 'libx264',
		'-pix_fmt', 'yuv420p',
		path.join(api.mediaFolder, movie.folder, 'clip.mp4'),
	]);
};
