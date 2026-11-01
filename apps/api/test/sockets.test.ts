import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import type { Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ownerCredentials, startApi, type TestApi, type TestClient } from './support/api';
import { hasFfmpeg, holdFfmpeg, releaseFfmpeg, waitForHeldRun } from './support/ffmpeg';
import { addCorruptVideo, addUser, seedMovie } from './support/seed';
import { collectNotifications, connection, disconnection, openSocket } from './support/socket';

describe('sockets', () => {
	let api: TestApi;
	let owner: TestClient;
	const sockets: Socket[] = [];

	const open = (options?: Parameters<typeof openSocket>[1]) => {
		const socket = openSocket(api, options);
		sockets.push(socket);
		return socket;
	};

	const openFor = async ({ cookie }: TestClient) => {
		const socket = open({ headers: { cookie } });
		expect(await connection(socket)).toBe('connected');
		return socket;
	};

	beforeAll(async () => {
		api = await startApi();
		owner = await api.createOwner();
	});

	afterEach(() => {
		sockets.splice(0).forEach((socket) => socket.disconnect());
	});

	afterAll(async () => {
		await api?.stop();
	});

	describe.each(['polling', 'websocket'] as const)('over %s', (transport) => {
		it('refuses a connection with no session', async () => {
			expect(await connection(open({ transport }))).toBe('unauthorized');
		});

		it('refuses an invalid session', async () => {
			const socket = open({ transport, headers: { cookie: 'session=invalid' } });

			expect(await connection(socket)).toBe('unauthorized');
		});

		it('accepts a session', async () => {
			const socket = open({ transport, headers: { cookie: owner.cookie } });

			expect(await connection(socket)).toBe('connected');
		});

		it('refuses another site, even with a session', async () => {
			const socket = open({ transport, headers: { cookie: owner.cookie, origin: 'https://evil.example' } });

			expect(await connection(socket)).not.toBe('connected');
			expect(socket.connected).toBe(false);
		});
	});

	it('accepts an Origin that matches the host', async () => {
		const socket = open({ headers: { cookie: owner.cookie, origin: api.url } });

		expect(await connection(socket)).toBe('connected');
	});

	it('disconnects the sockets of a session that logs out, and no others', async () => {
		const leaving = await api.logIn(ownerCredentials.username, ownerCredentials.password);
		const leavingSocket = await openFor(leaving);
		const stayingSocket = await openFor(owner);
		const disconnected = disconnection(leavingSocket);

		await leaving.logOut();

		expect(await disconnected).toBe('io server disconnect');
		expect(stayingSocket.connected).toBe(true);
		expect(await connection(open({ headers: { cookie: leaving.cookie } }))).toBe('unauthorized');
	});

	describe('notifications', () => {
		let second: TestClient;
		let bystander: TestClient;

		beforeAll(async () => {
			await addUser(api, 'second', 'correct horse');
			await addUser(api, 'bystander', 'correct horse');
			second = await api.logIn('second', 'correct horse');
			bystander = await api.logIn('bystander', 'correct horse');
		});

		/** Long enough for the API to have announced a job twice, had it been going to. */
		const announcePeriod = 1_200;

		it('reach the users who asked for a transcode, including one who joined mid-job, once each', async () => {
			const ownerNotifications = collectNotifications(await openFor(owner));
			const secondNotifications = collectNotifications(await openFor(second));
			const bystanderNotifications = collectNotifications(await openFor(bystander));
			const movie = await seedMovie(api, 5001, 'Notified');
			await writeFile(path.join(api.mediaFolder, movie.folder, 'held.mp4'), 'not read');
			await holdFfmpeg(api, movie);

			await owner.get(`/transcode/request/${movie.id}`);
			await waitForHeldRun(api, movie);
			await second.get(`/transcode/request/${movie.id}`);
			await releaseFfmpeg(api, movie);

			const ready = { type: 'transcode:ready', data: { title: 'Notified' } };
			await api.waitFor(async () => expect(ownerNotifications).toEqual([ready]));
			await api.waitFor(async () => expect(secondNotifications).toEqual([ready]));
			await sleep(announcePeriod);
			expect(ownerNotifications).toEqual([ready]);
			expect(secondNotifications).toEqual([ready]);
			expect(bystanderNotifications).toEqual([]);
		});

		it.skipIf(!hasFfmpeg)('say why a transcode failed, once, to those who asked', async () => {
			const ownerNotifications = collectNotifications(await openFor(owner));
			const bystanderNotifications = collectNotifications(await openFor(bystander));
			const movie = await seedMovie(api, 5002, 'Unwatchable');
			await addCorruptVideo(api, movie);

			await owner.get(`/transcode/request/${movie.id}`);

			await api.waitFor(async () => expect(ownerNotifications).toHaveLength(1));
			expect(ownerNotifications[0]).toEqual({
				type: 'transcode:failed',
				data: { title: 'Unwatchable', error: expect.stringContaining('Invalid data') },
			});
			await sleep(announcePeriod);
			expect(ownerNotifications).toHaveLength(1);
			expect(bystanderNotifications).toEqual([]);
		});
	});
});
