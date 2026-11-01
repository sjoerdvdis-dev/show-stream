import { io, type Socket } from 'socket.io-client';
import type { APINotification } from '@workspace/contract/api-types';
import type { TestApi } from './api';

type Options = {
	headers?: Record<string, string>;
	transport?: 'polling' | 'websocket';
};

/** A real client, with no retries, so that one refusal is the final answer. */
export const openSocket = (api: TestApi, { headers, transport = 'websocket' }: Options = {}): Socket =>
	io(api.url, {
		path: '/socket',
		transports: [transport],
		extraHeaders: headers,
		reconnection: false,
		forceNew: true,
	});

/** Resolves with `connected`, or with the reason the server gave for refusing. */
export const connection = (socket: Socket) =>
	new Promise<string>((resolve) => {
		socket.once('connect', () => resolve('connected'));
		socket.once('connect_error', (error) => resolve(error.message));
	});

/** Everything this socket receives from now on. */
export const collectNotifications = (socket: Socket) => {
	const notifications: APINotification[] = [];
	socket.on('notification', (notification: APINotification) => notifications.push(notification));
	return notifications;
};

export const disconnection = (socket: Socket) =>
	new Promise<string>((resolve) => socket.once('disconnect', (reason) => resolve(reason)));
