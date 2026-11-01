/**
 * Notification API
 * Send notifications to clients through sockets. Each socket joins a room for its user and
 * one for its session, and nothing is sent to all sockets.
 */

import type { Server } from 'socket.io';
import type { APINotification } from '@workspace/contract/api-types';
import type { Session } from './auth';

let server: Server | undefined;

const userRoom = (userId: number) => `user:${userId}`;
const sessionRoom = (sessionId: string) => `session:${sessionId}`;

export const setupNotifications = (io: Server) => {
	server = io;
	io.on('connection', (socket) => {
		const session: Session = socket.data.session;
		socket.join([userRoom(session.user.id), sessionRoom(session.id)]);
	});
};

export const notifyUsers = (userIds: number[], notification: APINotification) => {
	// `to` with no rooms would reach every socket.
	if (userIds.length > 0) {
		server?.to(userIds.map(userRoom)).emit('notification', { ...notification });
	}
};

export const disconnectSession = (sessionId: string) => {
	server?.in(sessionRoom(sessionId)).disconnectSockets();
};
