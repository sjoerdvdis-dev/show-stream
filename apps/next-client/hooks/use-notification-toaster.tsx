'use client';

import { socket } from '@/lib/socket';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { APINotification } from '@workspace/contract/api-types';

export const useNotificationToaster = () => {
	useEffect(() => {
		const notificationHandler = (notification: APINotification) => {
			if (notification.type == 'transcode:ready') {
				toast.success(`Playback for ${notification.data.title} is ready!`, { closeButton: true });
			}
			if (notification.type == 'transcode:failed') {
				const { title, error } = notification.data;
				toast.error(`Playback preparation for ${title} failed.`, { description: error, closeButton: true });
			}
		};

		socket.on('notification', notificationHandler);
		socket.connect();
		return () => {
			socket.off('notification', notificationHandler);
			socket.disconnect();
		};
	}, []);
};
