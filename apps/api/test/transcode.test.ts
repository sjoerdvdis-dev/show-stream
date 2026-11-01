import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, type TestApi } from './support/api';
import { addValidVideo, hasFfmpeg } from './support/ffmpeg';
import { seedMovie } from './support/seed';

describe('transcode', () => {
	let api: TestApi;

	const transcodeStatus = async (id: number) => {
		const { metadata } = await (await api.get(`/movie/${id}`)).json();
		return metadata.transcodeStatus;
	};

	beforeAll(async () => {
		api = await startApi();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('answers 400 and not ready for an unknown movie', async () => {
		const response = await api.get('/transcode/request/9999');

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ status: 'not ready' });
	});

	it('answers 400 when the folder holds no .mp4', async () => {
		const movie = await seedMovie(api, 2001, 'Mkv Only');
		await writeFile(path.join(api.mediaFolder, movie.folder, 'movie.mkv'), 'not read');

		const response = await api.get(`/transcode/request/${movie.id}`);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ status: 'not ready' });
	});

	it('marks a movie ready when its playlist is already cached', async () => {
		const movie = await seedMovie(api, 2002, 'Cached');
		await writeFile(path.join(api.mediaFolder, movie.folder, 'movie.mp4'), 'not read');
		const cache = path.join(api.mediaFolder, 'cache', String(movie.id));
		await mkdir(cache, { recursive: true });
		await writeFile(path.join(cache, 'playlist.m3u8'), '#EXTM3U\n');

		const response = await api.get(`/transcode/request/${movie.id}`);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: 'ready' });
		await api.waitFor(async () => expect(await transcodeStatus(movie.id)).toBe('ready'));
	});

	it('has no playlist before a movie is ready', async () => {
		const movie = await seedMovie(api, 2003, 'Not Started');

		expect((await api.get(`/transcode/playlist/${movie.id}`)).status).toBe(404);
	});

	it('refuses to stream a movie that is not ready', async () => {
		const movie = await seedMovie(api, 2004, 'Not Streamable');

		expect((await api.get(`/streams/${movie.id}/playlist.m3u8`)).status).toBe(400);
	});

	describe.skipIf(!hasFfmpeg)('with ffmpeg', () => {
		it('converts a movie to HLS and streams it', async () => {
			const movie = await seedMovie(api, 2005, 'Playable');
			await addValidVideo(api, movie);

			const request = await api.get(`/transcode/request/${movie.id}`);
			expect(request.status).toBe(200);
			expect(await request.json()).toEqual({ status: 'in progress' });

			await api.waitFor(async () => expect(await transcodeStatus(movie.id)).toBe('ready'));

			const playlist = await api.get(`/transcode/playlist/${movie.id}`);
			expect(playlist.status).toBe(200);
			expect(await playlist.json()).toEqual({ playlistUrl: `/streams/${movie.id}/playlist.m3u8` });

			const stream = await api.get(`/streams/${movie.id}/playlist.m3u8`);
			expect(stream.status).toBe(200);
			const manifest = await stream.text();
			expect(manifest).toContain('#EXTM3U');
			const segment = manifest.split('\n').find((line) => line.endsWith('.ts'));
			expect(segment).toBeDefined();

			const video = await api.get(`/streams/${movie.id}/${segment}`);
			expect(video.status).toBe(200);
			expect((await video.arrayBuffer()).byteLength).toBeGreaterThan(0);

			// A ready movie only streams its own HLS files.
			expect((await api.get(`/streams/${movie.id}/clip.mp4`)).status).toBe(400);
			expect((await api.get(`/streams/${movie.id}/..%2Fplaylist.m3u8`)).status).toBe(400);
		});
	});
});
