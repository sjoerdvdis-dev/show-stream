import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHeartbeat } from '../src/heartbeat';

describe('the heartbeat', () => {
	let folder: string;

	beforeEach(async () => {
		folder = await mkdtemp(path.join(tmpdir(), 'show-stream-heartbeat-test-'));
	});

	afterEach(async () => {
		vi.useRealTimers();
		await rm(folder, { recursive: true, force: true });
	});

	it('writes at once, then only every few seconds', async () => {
		vi.useFakeTimers({ toFake: ['Date'], now: 1_000_000 });
		const file = path.join(folder, 'heartbeat');
		const beat = createHeartbeat(file);

		beat();
		expect(await readFile(file, 'utf8')).toBe('1000000\n');

		vi.setSystemTime(1_004_000);
		beat();
		expect(await readFile(file, 'utf8')).toBe('1000000\n');

		vi.setSystemTime(1_005_000);
		beat();
		expect(await readFile(file, 'utf8')).toBe('1005000\n');
	});

	it('does nothing without a file', async () => {
		createHeartbeat(undefined)();

		expect(await readdir(folder)).toEqual([]);
	});
});
