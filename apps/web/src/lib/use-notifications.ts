import { useEffect } from 'react';
import { toast } from 'sonner';
import { apiNotificationSchema } from '@workspace/contract/api-types';
import { openSocket } from '@/lib/socket';

const showNotification = (payload: unknown) => {
	const { success, data: notification } = apiNotificationSchema.safeParse(payload);
	if (!success) return;

	if (notification.type === 'transcode:ready') {
		toast.success(`Playback for ${notification.data.title} is ready!`, { closeButton: true });
	}
	if (notification.type === 'transcode:failed') {
		const { title, error } = notification.data;
		toast.error(`Playback preparation for ${title} failed.`, { description: error, closeButton: true });
	}
};

/**
 * Keeps a socket open while the calling component is mounted. Only the signed-in layout calls
 * this, so there is no socket before login, and leaving that layout closes it.
 */
export const useNotifications = () => {
	useEffect(() => {
		const socket = openSocket();
		socket.on('notification', showNotification);
		return () => {
			socket.disconnect();
		};
	}, []);
};
