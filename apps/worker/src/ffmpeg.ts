import { spawn } from 'node:child_process';

/** Enough for ffmpeg's last few lines, however long the run. */
const keptStderr = 4_000;
const reasonLines = 5;

/** The last lines of ffmpeg's output, which say why it stopped. Progress updates end in `\r`. */
const lastLines = (stderr: string) => stderr.split(/[\r\n]+/).filter(Boolean).slice(-reasonLines).join('\n');

/**
 * The only way to run ffmpeg. The arguments are passed as an array with no shell, so a file
 * name can never be read as a command. It resolves when ffmpeg exits with 0, and otherwise
 * rejects with the tail of its output. After `signal` aborts it stops ffmpeg, and rejects
 * with the abort reason once ffmpeg has gone.
 */
export const runFfmpeg = (args: string[], { signal }: { signal?: AbortSignal } = {}): Promise<void> =>
	new Promise((resolve, reject) => {
		const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
		let stderr = '';

		const stop = () => child.kill('SIGTERM');
		signal?.addEventListener('abort', stop, { once: true });

		child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
			stderr = (stderr + chunk).slice(-keptStderr);
		});

		child.once('error', (error) => {
			signal?.removeEventListener('abort', stop);
			reject(new Error(`ffmpeg could not start: ${error.message}`));
		});

		child.once('close', (code, exitSignal) => {
			signal?.removeEventListener('abort', stop);
			if (signal?.aborted) {
				reject(signal.reason);
			} else if (code === 0) {
				resolve();
			} else {
				const ending = code === null ? `was stopped by ${exitSignal}` : `exited with code ${code}`;
				reject(new Error(lastLines(stderr) || `ffmpeg ${ending}`));
			}
		});
	});
