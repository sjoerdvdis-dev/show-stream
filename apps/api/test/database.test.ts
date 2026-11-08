import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ownerCredentials, runApiUntilExit, startApi, type TestApi } from './support/api';
import { seedMovie } from './support/seed';

describe('the database', () => {
	describe('across a restart', () => {
		let api: TestApi;

		beforeAll(async () => {
			api = await startApi();
		});

		afterAll(async () => {
			await api?.stop();
		});

		it('keeps its users, their sessions, its library and its transcode state', async () => {
			const movie = await seedMovie(api, 8001, 'Kept Movie');
			await writeFile(path.join(api.mediaFolder, movie.folder, 'movie.mp4'), 'not read');
			const cache = path.join(api.mediaFolder, 'cache', String(movie.id));
			await mkdir(cache, { recursive: true });
			await writeFile(path.join(cache, 'playlist.m3u8'), '#EXTM3U\n#EXT-X-ENDLIST\n');
			const owner = await api.createOwner();
			await owner.get(`/transcode/request/${movie.id}`);

			await api.restart();

			expect((await owner.get('/auth/me')).status).toBe(200);
			expect((await api.post('/auth/login', ownerCredentials)).status).toBe(200);
			expect(await (await owner.get('/library/movies')).json()).toMatchObject({
				items: [{ id: movie.id, title: 'Kept Movie', status: 'ready' }],
			});
		});
	});

	describe('that cannot be migrated', () => {
		let folder: string;

		beforeAll(async () => {
			folder = await mkdtemp(path.join(tmpdir(), 'show-stream-bad-database-'));
		});

		afterAll(async () => {
			await rm(folder, { recursive: true, force: true, maxRetries: 5 });
		});

		it('stops the API before it listens', async () => {
			const databasePath = path.join(folder, 'app.db');
			await writeFile(databasePath, 'This is not a SQLite database, and it is long enough to be read as one.');

			const { code, output } = await runApiUntilExit({ DATABASE_PATH: databasePath });

			expect(code).toBe(1);
			expect(output).toContain('could not be opened or migrated');
			expect(output).not.toContain('API server is running');
		});
	});
});
