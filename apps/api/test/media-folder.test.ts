import { mkdir, mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, type TestApi, type TestClient } from './support/api';
import { addValidVideo, hasFfmpeg } from './support/ffmpeg';

const scannedMovie = { id: 7001, title: 'Scanned Movie', folder: 'movies/Scanned Movie (2024)' };

describe.skipIf(!hasFfmpeg)('a MEDIA_FOLDER outside the app folder', () => {
	let api: TestApi;
	let owner: TestClient;
	let outside: string;
	let library: string;

	const transcodeStatus = async () => {
		const { metadata } = await (await owner.get(`/movie/${scannedMovie.id}`)).json();
		return metadata.transcodeStatus;
	};

	// A dot folder and a space, which are both ordinary in a real library path.
	beforeAll(async () => {
		outside = await mkdtemp(path.join(tmpdir(), 'show-stream-library-test-'));
		library = path.join(outside, '.config', 'My Library');
		await mkdir(path.join(library, scannedMovie.folder), { recursive: true });
		api = await startApi({ mediaFolder: library, fakeTmdb: true });
		owner = await api.createOwner();
		await addValidVideo(api, scannedMovie);
	});

	afterAll(async () => {
		await api?.stop();
		await rm(outside, { recursive: true, force: true, maxRetries: 5 });
	});

	it('scans, transcodes and streams a title', async () => {
		expect((await owner.post('/scan')).status).toBe(200);
		expect(await transcodeStatus()).toBe('not ready');

		const request = await owner.get(`/transcode/request/${scannedMovie.id}`);
		expect(request.status).toBe(200);
		await api.waitFor(async () => expect(await transcodeStatus()).toBe('ready'));

		const { playlistUrl } = await (await owner.get(`/transcode/playlist/${scannedMovie.id}`)).json();
		const playlist = await owner.get(playlistUrl);
		expect(playlist.status).toBe(200);
		const segment = (await playlist.text()).split('\n').find((line) => line.endsWith('.ts'));
		expect(segment).toBeDefined();

		const video = await owner.get(`/streams/${scannedMovie.id}/${segment}`);
		expect(video.status).toBe(200);
		expect((await video.arrayBuffer()).byteLength).toBeGreaterThan(0);
	});

	it('keeps the cache in that folder', async () => {
		const cache = path.join(library, 'cache', String(scannedMovie.id));

		expect((await stat(cache)).isDirectory()).toBe(true);
		expect(await readdir(cache)).toContain('playlist.m3u8');
	});
});
