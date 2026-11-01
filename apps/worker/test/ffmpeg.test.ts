import { chmod, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runFfmpeg } from '../src/ffmpeg';

describe('runFfmpeg', () => {
	let folder: string;

	/** Puts a shell script named `ffmpeg` first on the PATH. */
	const fakeFfmpeg = async (script: string) => {
		const file = path.join(folder, 'ffmpeg');
		await writeFile(file, `#!/bin/sh\n${script}\n`);
		await chmod(file, 0o755);
	};

	const failureOf = async (run: Promise<void>) => run.then(() => undefined, (error: Error) => error);

	beforeEach(async () => {
		folder = await mkdtemp(path.join(tmpdir(), 'show-stream-ffmpeg-test-'));
		vi.stubEnv('PATH', `${folder}${path.delimiter}${process.env.PATH}`);
	});

	afterEach(async () => {
		vi.unstubAllEnvs();
		await rm(folder, { recursive: true, force: true });
	});

	it('resolves when ffmpeg exits with 0', async () => {
		await fakeFfmpeg('exit 0');

		await expect(runFfmpeg([])).resolves.toBeUndefined();
	});

	it('rejects with the last lines of its output', async () => {
		await fakeFfmpeg(`
			for line in 1 2 3 4 5 6 7; do echo "line $line" >&2; done
			exit 1
		`);

		const failure = await failureOf(runFfmpeg([]));

		expect(failure?.message).toBe('line 3\nline 4\nline 5\nline 6\nline 7');
	});

	it('reads a progress update ending in a carriage return as a line', async () => {
		await fakeFfmpeg(`printf 'frame=1\\rframe=2\\rConversion failed!\\n' >&2; exit 1`);

		const failure = await failureOf(runFfmpeg([]));

		expect(failure?.message).toBe('frame=1\nframe=2\nConversion failed!');
	});

	it('keeps only the tail of a long output', async () => {
		await fakeFfmpeg(`
			head -c 1000000 /dev/zero | tr '\\0' 'x' >&2
			echo >&2
			echo 'the end' >&2
			exit 1
		`);

		const failure = await failureOf(runFfmpeg([]));

		expect(failure?.message.length).toBeLessThan(5_000);
		expect(failure?.message.endsWith('the end')).toBe(true);
	});

	it('says how ffmpeg ended when it printed nothing', async () => {
		await fakeFfmpeg('exit 3');

		expect((await failureOf(runFfmpeg([])))?.message).toBe('ffmpeg exited with code 3');
	});

	it('gives each argument to ffmpeg as it is, with no shell', async () => {
		const marker = path.join(folder, 'injected');
		const argument = `$(touch ${marker}); touch ${marker} | "quoted" 'single'`;
		await fakeFfmpeg(`printf '%s' "$1" > "${folder}/received"`);

		await runFfmpeg([argument]);

		expect(await readFile(path.join(folder, 'received'), 'utf8')).toBe(argument);
		expect(await readdir(folder)).not.toContain('injected');
	});

	it('rejects if ffmpeg is not there', async () => {
		vi.stubEnv('PATH', folder);

		expect((await failureOf(runFfmpeg([])))?.message).toMatch(/^ffmpeg could not start: .*ENOENT/);
	});

	it('stops ffmpeg when aborted, and rejects with the reason once it has gone', async () => {
		await fakeFfmpeg(`
			trap 'touch "${folder}/stopped"; exit 255' TERM
			touch "${folder}/started"
			while true; do sleep 0.05; done
		`);
		const controller = new AbortController();
		const run = runFfmpeg([], { signal: controller.signal });
		while (!(await readdir(folder)).includes('started')) {
			await sleep(10);
		}
		const reason = new Error('Stopping');

		controller.abort(reason);

		expect(await failureOf(run)).toBe(reason);
		expect(await readdir(folder)).toContain('stopped');
	});
});
