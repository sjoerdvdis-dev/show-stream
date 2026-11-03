import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import type { LibraryItem } from '@workspace/contract/library';
import type { Scan } from '@workspace/contract/api-types';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startApi, type TestApi, type TestClient } from './support/api';
import { clearLibrary, seedMovie } from './support/seed';

/** The fake TMDB's movies. See `support/fake-tmdb.mjs`. */
const scannedMovie = 7001;
const brokenArt = 7900;
const slowArt = 7950;
const noArt = 7990;

const finishedScan = (api: TestApi, client: TestClient) =>
	api.waitFor(async () => {
		const { scan } = (await (await client.get('/scan')).json()) as { scan: Scan | null };
		expect(['done', 'failed']).toContain(scan?.status);
		return scan!;
	});

const scanLibrary = async (api: TestApi, client: TestClient) => {
	expect((await client.post('/scan')).status).toBe(202);
	return finishedScan(api, client);
};

const addFolders = (api: TestApi, ...folders: string[]) =>
	Promise.all(folders.map((folder) => mkdir(path.join(api.mediaFolder, 'movies', folder), { recursive: true })));

const itemOf = async (client: TestClient, id: number): Promise<LibraryItem | undefined> => {
	const { items } = await (await client.get('/library/movies?pageSize=100')).json();
	return items.find((item: LibraryItem) => item.id === id);
};

const imageText = async (response: Response) => new TextDecoder().decode((await response.arrayBuffer()).slice(4));

describe('title images', () => {
	let api: TestApi;
	let owner: TestClient;

	beforeAll(async () => {
		api = await startApi({ fakeTmdb: true });
		owner = await api.createOwner();
	});

	beforeEach(async () => {
		await rm(path.join(api.mediaFolder, 'movies'), { recursive: true, force: true });
		await rm(path.join(api.mediaFolder, 'cache'), { recursive: true, force: true });
		await mkdir(path.join(api.mediaFolder, 'movies'));
		clearLibrary(api);
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('are stored by a scan, and served with caching headers', async () => {
		await addFolders(api, 'Scanned Movie (2024)');

		expect(await scanLibrary(api, owner)).toMatchObject({ status: 'done', errors: [] });

		expect(await itemOf(owner, scannedMovie)).toMatchObject({ hasPoster: true, hasBackdrop: true });

		const poster = await owner.get(`/library/movies/${scannedMovie}/images/poster`);
		expect(poster.status).toBe(200);
		expect(poster.headers.get('content-type')).toBe('image/jpeg');
		expect(poster.headers.get('cache-control')).toMatch(/^private, max-age=\d{6,}$/);
		expect(poster.headers.get('etag')).toBeTruthy();
		expect(await imageText(poster)).toMatch(/^w500 poster-7001\.jpg request \d+$/);

		const backdrop = await owner.get(`/library/movies/${scannedMovie}/images/backdrop`);
		expect(backdrop.status).toBe(200);
		expect(await imageText(backdrop)).toMatch(/^w1280 backdrop-7001\.jpg request \d+$/);
	});

	it('answer 304 to a browser that already has the image', async () => {
		await addFolders(api, 'Scanned Movie (2024)');
		await scanLibrary(api, owner);
		const first = await owner.get(`/library/movies/${scannedMovie}/images/poster`);

		// As a browser revalidates. Without a `cache-control` of its own, Node's fetch adds `no-cache`.
		const again = await owner.get(`/library/movies/${scannedMovie}/images/poster`, {
			'if-none-match': first.headers.get('etag')!,
			'cache-control': 'max-age=0',
		});

		expect(again.status).toBe(304);
	});

	it('are not fetched again by the next scan', async () => {
		await addFolders(api, 'Scanned Movie (2024)');
		await scanLibrary(api, owner);
		const before = await imageText(await owner.get(`/library/movies/${scannedMovie}/images/poster`));

		await scanLibrary(api, owner);

		expect(await imageText(await owner.get(`/library/movies/${scannedMovie}/images/poster`))).toBe(before);
	});

	it('are filled in for a title that was already in the library', async () => {
		await seedMovie(api, scannedMovie, 'Scanned Movie');
		expect(await itemOf(owner, scannedMovie)).toMatchObject({ hasPoster: false, hasBackdrop: false });
		expect((await owner.get(`/library/movies/${scannedMovie}/images/poster`)).status).toBe(404);

		await scanLibrary(api, owner);

		expect(await itemOf(owner, scannedMovie)).toMatchObject({ hasPoster: true, hasBackdrop: true });
		expect((await owner.get(`/library/movies/${scannedMovie}/images/poster`)).status).toBe(200);
	});

	it('that fail to download are a scan problem, and the title is kept', async () => {
		await addFolders(api, 'Broken Art (2024)');

		const scan = await scanLibrary(api, owner);

		expect(scan.status).toBe('done');
		expect(scan.counts).toMatchObject({ found: 1, added: 1, failed: 0 });
		expect(scan.errors).toEqual(['Broken Art (2024): could not store its poster: TMDB answered 404']);
		expect(await itemOf(owner, brokenArt)).toMatchObject({ title: 'Broken Art', hasPoster: false, hasBackdrop: true });
		expect((await owner.get(`/library/movies/${brokenArt}/images/poster`)).status).toBe(404);
	});

	it('answer 404, in the one error shape, for a title with no art or no title at all', async () => {
		await addFolders(api, 'No Art (2024)');
		await scanLibrary(api, owner);

		for (const route of [`/library/movies/${noArt}/images/poster`, '/library/movies/123456/images/backdrop']) {
			const response = await owner.get(route);
			expect(response.status).toBe(404);
			expect(await response.json()).toEqual({ code: 'not_found', message: 'Image not found' });
		}
	});

	it('answer 400 to a kind of image that does not exist, which keeps paths out of user input', async () => {
		for (const kind of ['logo', '..%2F..%2Fapp.db', 'poster.jpg']) {
			expect((await owner.get(`/library/movies/${scannedMovie}/images/${kind}`)).status).toBe(400);
		}
	});

	it('answer 401 with no session', async () => {
		const response = await api.get(`/library/movies/${scannedMovie}/images/poster`);

		expect(response.status).toBe(401);
		expect(await response.json()).toMatchObject({ code: 'unauthorized' });
	});
});

describe('an image download that is killed partway', () => {
	let api: TestApi;
	let owner: TestClient;

	beforeAll(async () => {
		api = await startApi({ fakeTmdb: true });
		owner = await api.createOwner();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('leaves no file that looks finished', async () => {
		await addFolders(api, 'Slow Art (2024)');
		const folder = path.join(api.mediaFolder, 'cache', 'images', 'movie', String(slowArt));

		expect((await owner.post('/scan')).status).toBe(202);
		// The fake TMDB sends the start of this poster and then nothing more.
		await api.waitFor(async () => {
			expect(await readdir(folder)).toContain('poster.partial');
		});
		await api.killWorkers();

		expect((await readdir(folder)).filter((file) => file.startsWith('poster.') && file !== 'poster.partial')).toEqual([]);
		expect(await itemOf(owner, slowArt)).toMatchObject({ hasPoster: false });
		expect((await owner.get(`/library/movies/${slowArt}/images/poster`)).status).toBe(404);
	});
});
