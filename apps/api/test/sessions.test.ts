import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ownerCredentials, startApi, type TestApi, type TestClient } from './support/api';
import { addUser, hasSessionWithId, seedMovie, sessionRow, setSessionExpiry } from './support/seed';

const day = 24 * 60 * 60 * 1000;
const minute = 60 * 1000;
const thirtyDaysInSeconds = 30 * 24 * 60 * 60;

describe('sessions', () => {
	let api: TestApi;
	let owner: TestClient;

	const logIn = () => api.logIn(ownerCredentials.username, ownerCredentials.password);

	beforeAll(async () => {
		api = await startApi();
		owner = await api.createOwner();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('returns the current user', async () => {
		const response = await owner.get('/auth/me');

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ user: { userId: expect.any(String), username: 'owner', role: 'owner' } });
	});

	it('stores only the hash of a token', async () => {
		expect(owner.token).toMatch(/^[0-9a-f]{64}$/);
		expect(sessionRow(api, owner)?.id).toMatch(/^[0-9a-f]{64}$/);
		expect(sessionRow(api, owner)?.id).not.toBe(owner.token);
		expect(hasSessionWithId(api, owner.token)).toBe(false);
	});

	it('refuses a token that is not a session', async () => {
		const forged = await api.get('/auth/me', { cookie: `session=${'0'.repeat(64)}` });

		expect(forged.status).toBe(401);
	});

	it('refuses the stored hash as a token, so that a leaked database opens nothing', async () => {
		const leaked = await api.get('/auth/me', { cookie: `session=${sessionRow(api, owner)?.id}` });

		expect(leaked.status).toBe(401);
	});

	it('reads the session from among other cookies', async () => {
		const response = await api.get('/auth/me', { cookie: `theme=dark; ${owner.cookie}; other=1` });

		expect(response.status).toBe(200);
	});

	it('uses safe cookie attributes by default', async () => {
		const response = await api.post('/auth/login', ownerCredentials);

		const [cookie] = response.headers.getSetCookie();
		expect(cookie).toContain('HttpOnly');
		expect(cookie).toContain('SameSite=Lax');
		expect(cookie).toContain('Secure');
		expect(cookie).toContain('Path=/');
		expect(cookie).toContain(`Max-Age=${thirtyDaysInSeconds}`);
	});

	describe('logging out', () => {
		it('ends that session at once, and only that one', async () => {
			const leaving = await logIn();
			const staying = await logIn();

			const response = await leaving.logOut();

			expect(response.status).toBe(200);
			expect((await leaving.get('/auth/me')).status).toBe(401);
			expect((await staying.get('/auth/me')).status).toBe(200);
			expect(sessionRow(api, leaving)).toBeUndefined();
		});

		it('clears the cookie', async () => {
			const leaving = await logIn();

			const [cookie] = (await leaving.logOut()).headers.getSetCookie();

			expect(cookie).toMatch(/^session=;/);
			expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
		});

		it('needs a session', async () => {
			expect((await api.post('/auth/logout')).status).toBe(401);
		});
	});

	describe('expiry', () => {
		it('starts 30 days out', async () => {
			const client = await logIn();

			const remaining = (sessionRow(api, client)?.expiresAt.getTime() ?? 0) - Date.now();

			expect(remaining).toBeGreaterThan(30 * day - minute);
			expect(remaining).toBeLessThanOrEqual(30 * day);
		});

		it('refuses an expired session and removes its row', async () => {
			const client = await logIn();
			setSessionExpiry(api, client, new Date(Date.now() - 1));

			expect((await client.get('/auth/me')).status).toBe(401);
			expect(sessionRow(api, client)).toBeUndefined();
		});

		it('slides, and renews the cookie, once a session is over an hour old', async () => {
			const client = await logIn();
			setSessionExpiry(api, client, new Date(Date.now() + 29 * day));

			const response = await client.get('/auth/me');

			expect(response.status).toBe(200);
			expect((sessionRow(api, client)?.expiresAt.getTime() ?? 0) - Date.now()).toBeGreaterThan(30 * day - minute);
			expect(response.headers.getSetCookie()).toEqual([
				expect.stringContaining(`session=${client.token}`),
			]);
			expect(response.headers.getSetCookie()[0]).toContain(`Max-Age=${thirtyDaysInSeconds}`);
		});

		it('does not write within the hour, so that video segments cost no writes', async () => {
			const client = await logIn();
			const expiresAt = new Date(Date.now() + 30 * day - 30 * minute);
			setSessionExpiry(api, client, expiresAt);

			const responses = [await client.get('/auth/me'), await client.get('/movies'), await client.get('/auth/me')];

			expect(responses.map(({ status }) => status)).toEqual([200, 200, 200]);
			expect(responses.flatMap((response) => response.headers.getSetCookie())).toEqual([]);
			expect(sessionRow(api, client)?.expiresAt).toEqual(expiresAt);
		});
	});

	describe('on /streams', () => {
		let streamRoute: string;

		beforeAll(async () => {
			const movie = await seedMovie(api, 6001, 'Streamed');
			await writeFile(path.join(api.mediaFolder, movie.folder, 'movie.mp4'), 'not read');
			const cache = path.join(api.mediaFolder, 'cache', String(movie.id));
			await mkdir(cache, { recursive: true });
			await writeFile(path.join(cache, 'playlist.m3u8'), '#EXTM3U\n');
			await owner.get(`/transcode/request/${movie.id}`);
			streamRoute = `/streams/${movie.id}/playlist.m3u8`;
		});

		it('checks the session on each request', async () => {
			const client = await logIn();

			expect((await client.get(streamRoute)).status).toBe(200);
			expect((await api.get(streamRoute)).status).toBe(401);

			await client.logOut();

			expect((await client.get(streamRoute)).status).toBe(401);
		});
	});

	describe('on POST /scan', () => {
		it('accepts an owner and an admin, and refuses a plain user', async () => {
			await addUser(api, 'viewer', 'correct horse');
			await addUser(api, 'helper', 'correct horse', 'admin');
			const viewer = await api.logIn('viewer', 'correct horse');
			const helper = await api.logIn('helper', 'correct horse');

			const refused = await viewer.post('/scan');

			expect(refused.status).toBe(403);
			expect(await refused.json()).toEqual({ code: 'forbidden', message: 'Only an admin can do this' });
			expect((await helper.post('/scan')).status).toBe(200);
			expect((await owner.post('/scan')).status).toBe(200);
		});
	});
});

describe('session startup', () => {
	let api: TestApi;

	afterEach(async () => {
		await api?.stop();
	});

	it('removes expired rows when the API starts', async () => {
		api = await startApi();
		const owner = await api.createOwner();
		setSessionExpiry(api, owner, new Date(Date.now() - 1));

		await api.restart();

		expect(sessionRow(api, owner)).toBeUndefined();
	});

	it('leaves `Secure` off only when configured to', async () => {
		api = await startApi({ envFile: 'SESSION_COOKIE_SECURE=false' });

		const response = await api.post('/auth/setup', ownerCredentials);

		const [cookie] = response.headers.getSetCookie();
		expect(cookie).toContain('HttpOnly');
		expect(cookie).toContain('SameSite=Lax');
		expect(cookie).not.toContain('Secure');
	});
});
