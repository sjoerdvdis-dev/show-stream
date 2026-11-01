/**
 * Notification API
 * Send notifications to clients through sockets
 */

import { Socket } from 'socket.io';
import type { APINotification } from '@workspace/types/api-types';

let sockets: Socket[] = [];

export const setupSocketNotifications = (socket: Socket) => {
	sockets.push(socket);
};

export const removeSocketNotifications = (socket: Socket) => {
	sockets = sockets.filter((s) => s.id !== socket.id);
};

export const sendNotificationToClients = (notification: APINotification) => {
	sockets.forEach((socket) => {
		socket.emit('notification', { ...notification });
	});
};
