import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, type TestApi } from './support/api';
import { addCorruptVideo, jobRow, seedMovie } from './support/seed';

type LogLine = { level: string; message: string; timestamp: string; jobId?: number; jobType?: string };

/** Fails on any line that is not JSON. */
const parse = (stdout: string) =>
	stdout
		.split('\n')
		.filter(Boolean)
		.map((line) => JSON.parse(line) as LogLine);

const levels = (stdout: string) => parse(stdout).map(({ level }) => level);

const messages = (stdout: string) => parse(stdout).map(({ message }) => message);

describe('logs', () => {
	describe('by default', () => {
		let api: TestApi;

		beforeAll(async () => {
			api = await startApi();
			const owner = await api.createOwner();
			const movie = await seedMovie(api, 5101, 'Logged Movie');
			await addCorruptVideo(api, movie);
			await owner.get(`/transcode/request/${movie.id}`);
			await api.waitFor(async () => expect(jobRow(api, movie)).toMatchObject({ status: 'failed' }));
			await api.waitFor(async () => expect(api.workerStdout()).toContain('Failed job'));
		});

		afterAll(async () => {
			await api.stop();
		});

		it('are JSON on every line of stdout, from the API and the worker', () => {
			for (const line of [...parse(api.stdout()), ...parse(api.workerStdout())]) {
				expect(line).toEqual(
					expect.objectContaining({
						level: expect.any(String),
						message: expect.any(String),
						timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
					}),
				);
			}
			expect(messages(api.stdout())).toContain(`API server is running on port ${new URL(api.url).port}`);
			expect(messages(api.workerStdout())).toContain('Worker is running');
		});

		it('name the job in the worker', () => {
			const lines = parse(api.workerStdout());

			expect(lines).toContainEqual(
				expect.objectContaining({ level: 'error', message: 'Failed job', jobType: 'transcode' }),
			);
			expect(lines.find(({ message }) => message === 'Started job')?.jobId).toEqual(expect.any(Number));
		});

		it('stop at info, so that requests are not logged', () => {
			expect(levels(api.stdout())).not.toContain('http');
		});

		it('write no file beside the app', async () => {
			const files = [...(await readdir(api.folder)), ...(await readdir(path.join(api.folder, 'worker')))];

			expect(files.filter((file) => file === 'logs' || file.endsWith('.log'))).toEqual([]);
		});
	});

	describe('with LOG_LEVEL', () => {
		it.each([
			['http', true, true],
			['error', false, false],
		])('at %s', async (logLevel, keepsRequests, keepsInfo) => {
			const api = await startApi({ logLevel });
			try {
				await api.get('/auth/setup');

				await api.waitFor(async () => expect(levels(api.stdout()).includes('http')).toBe(keepsRequests));
				expect(levels(api.stdout()).includes('info')).toBe(keepsInfo);
				expect(levels(api.workerStdout()).includes('info')).toBe(keepsInfo);
			} finally {
				await api.stop();
			}
		});
	});
});
