import { setTimeout as sleep } from 'node:timers/promises';
import type { Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ownerCredentials, startApi, type TestApi, type TestClient } from './support/api';
import { addValidVideo, hasFfmpeg } from './support/ffmpeg';
import { addUser, seedMovie } from './support/seed';
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

	describe.skipIf(!hasFfmpeg)('notifications', () => {
		it('reach the users who asked for a transcode, and no one else', async () => {
			await addUser(api, 'second', 'correct horse');
			await addUser(api, 'bystander', 'correct horse');
			const second = await api.logIn('second', 'correct horse');
			const bystander = await api.logIn('bystander', 'correct horse');
			const ownerNotifications = collectNotifications(await openFor(owner));
			const secondNotifications = collectNotifications(await openFor(second));
			const bystanderNotifications = collectNotifications(await openFor(bystander));
			const movie = await seedMovie(api, 5001, 'Notified');
			await addValidVideo(api, movie);

			await owner.get(`/transcode/request/${movie.id}`);
			await api.waitFor(async () => {
				const { metadata } = await (await owner.get(`/movie/${movie.id}`)).json();
				expect(metadata.transcodeStatus).toBe('in progress');
			});
			await second.get(`/transcode/request/${movie.id}`);

			const ready = { type: 'transcode:ready', data: { title: 'Notified' } };
			await api.waitFor(async () => expect(ownerNotifications).toEqual([ready]));
			await api.waitFor(async () => expect(secondNotifications).toEqual([ready]));
			await sleep(200);
			expect(bystanderNotifications).toEqual([]);
		});
	});
});
