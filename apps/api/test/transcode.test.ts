import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, type TestApi, type TestClient } from './support/api';
import { addValidVideo, hasFfmpeg } from './support/ffmpeg';
import { seedMovie } from './support/seed';

describe('transcode', () => {
	let api: TestApi;
	let owner: TestClient;

	const transcodeStatus = async (id: number) => {
		const { status } = await (await owner.get(`/library/movies/${id}`)).json();
		return status;
	};

	beforeAll(async () => {
		api = await startApi();
		owner = await api.createOwner();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('answers 404 for an unknown movie', async () => {
		const response = await owner.get('/transcode/request/9999');

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ code: 'not_found', message: 'Movie not found' });
	});

	it('answers 404 when the folder holds no .mp4', async () => {
		const movie = await seedMovie(api, 2001, 'Mkv Only');
		await writeFile(path.join(api.mediaFolder, movie.folder, 'movie.mkv'), 'not read');

		const response = await owner.get(`/transcode/request/${movie.id}`);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ code: 'not_found', message: 'Video not found' });
	});

	it('marks a movie ready when its playlist is already cached', async () => {
		const movie = await seedMovie(api, 2002, 'Cached');
		await writeFile(path.join(api.mediaFolder, movie.folder, 'movie.mp4'), 'not read');
		const cache = path.join(api.mediaFolder, 'cache', String(movie.id));
		await mkdir(cache, { recursive: true });
		await writeFile(path.join(cache, 'playlist.m3u8'), '#EXTM3U\n#EXT-X-ENDLIST\n');

		const response = await owner.get(`/transcode/request/${movie.id}`);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: 'ready' });
		await api.waitFor(async () => expect(await transcodeStatus(movie.id)).toBe('ready'));
	});

	it('does not trust a cached playlist with no end, which an older version may have left', async () => {
		const movie = await seedMovie(api, 2006, 'Half Cached');
		await writeFile(path.join(api.mediaFolder, movie.folder, 'movie.mp4'), 'not read');
		const cache = path.join(api.mediaFolder, 'cache', String(movie.id));
		await mkdir(cache, { recursive: true });
		await writeFile(path.join(cache, 'playlist.m3u8'), '#EXTM3U\n#EXTINF:6,\nsegment000.ts\n');

		const response = await owner.get(`/transcode/request/${movie.id}`);

		expect(await response.json()).toEqual({ status: 'in progress' });
	});

	it('has no playlist before a movie is ready', async () => {
		const movie = await seedMovie(api, 2003, 'Not Started');

		const response = await owner.get(`/transcode/playlist/${movie.id}`);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ code: 'not_found', message: 'Transcoding not found' });
	});

	it('refuses to stream a movie that is not ready', async () => {
		const movie = await seedMovie(api, 2004, 'Not Streamable');

		const response = await owner.get(`/streams/${movie.id}/playlist.m3u8`);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ code: 'not_found', message: 'Stream not found' });
	});

	it('answers 404 for a stream of an unknown movie', async () => {
		const response = await owner.get('/streams/9999/playlist.m3u8');

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ code: 'not_found', message: 'Stream not found' });
	});

	describe.skipIf(!hasFfmpeg)('with ffmpeg', () => {
		it('converts a movie to HLS and streams it', async () => {
			const movie = await seedMovie(api, 2005, 'Playable');
			await addValidVideo(api, movie);

			const request = await owner.get(`/transcode/request/${movie.id}`);
			expect(request.status).toBe(200);
			expect(await request.json()).toEqual({ status: 'in progress' });

			await api.waitFor(async () => expect(await transcodeStatus(movie.id)).toBe('ready'));

			const playlist = await owner.get(`/transcode/playlist/${movie.id}`);
			expect(playlist.status).toBe(200);
			expect(await playlist.json()).toEqual({ playlistUrl: `/streams/${movie.id}/playlist.m3u8` });

			const stream = await owner.get(`/streams/${movie.id}/playlist.m3u8`);
			expect(stream.status).toBe(200);
			const manifest = await stream.text();
			expect(manifest).toContain('#EXTM3U');
			const segment = manifest.split('\n').find((line) => line.endsWith('.ts'));
			expect(segment).toBeDefined();

			const video = await owner.get(`/streams/${movie.id}/${segment}`);
			expect(video.status).toBe(200);
			expect((await video.arrayBuffer()).byteLength).toBeGreaterThan(0);

			expect((await api.get(`/streams/${movie.id}/${segment}`)).status).toBe(401);

			// A ready movie only streams its own HLS files.
			expect((await owner.get(`/streams/${movie.id}/clip.mp4`)).status).toBe(400);
			expect((await owner.get(`/streams/${movie.id}/..%2Fplaylist.m3u8`)).status).toBe(400);

			const missing = await owner.get(`/streams/${movie.id}/segment999.ts`);
			expect(missing.status).toBe(404);
			expect(await missing.json()).toEqual({ code: 'not_found', message: 'Stream not found' });
		});
	});
});
