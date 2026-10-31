'use client';

import { socket } from '@/lib/socket';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { APINotification } from '@workspace/types/api-types';

export const useNotificationToaster = () => {
	useEffect(() => {
		const notificationHandler = ({ type, data }: APINotification) => {
			if (type == 'transcode:ready') {
				toast.success(`Playback for ${data.title} is ready!`, { closeButton: true });
			}
		};

		socket.on('notification', notificationHandler);
		return () => {
			socket.off('notification', notificationHandler);
		};
	}, []);
};
