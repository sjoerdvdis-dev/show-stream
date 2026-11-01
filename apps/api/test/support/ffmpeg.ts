import { execFile, spawnSync } from 'node:child_process';
import { access, readFile, rm, writeFile } from 'node:fs/promises';
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

const holdMarker = (api: TestApi, movie: SeededMovie) => path.join(api.mediaFolder, movie.folder, 'hold-ffmpeg');

/**
 * Makes runs of this title stop partway, with partial output written, until `releaseFfmpeg`.
 * The worker's `ffmpeg` is the script in `ffmpeg-shim`, which otherwise runs the real one.
 */
export const holdFfmpeg = async (api: TestApi, movie: SeededMovie) => {
	await writeFile(holdMarker(api, movie), '');
};

/** Resolves once this title's nth held run has written its partial output. Do this before releasing or killing it. */
export const waitForHeldRun = (api: TestApi, movie: SeededMovie, run = 1) =>
	api.waitFor(async () => {
		const runs = await readFile(path.join(api.mediaFolder, movie.folder, 'ffmpeg-held-runs'), 'utf8');
		if (runs.length < run) {
			throw new Error(`Held run ${run} has not started`);
		}
	});

/** Lets a held run finish, as a success. */
export const releaseFfmpeg = async (api: TestApi, movie: SeededMovie) => {
	await rm(holdMarker(api, movie));
};

/** Whether a held run of this title has been asked to stop, rather than being killed. */
export const ffmpegWasStopped = (api: TestApi, movie: SeededMovie) =>
	access(path.join(api.mediaFolder, movie.folder, 'ffmpeg-stopped')).then(
		() => true,
		() => false,
	);
