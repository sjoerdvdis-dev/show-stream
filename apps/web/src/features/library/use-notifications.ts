import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { apiNotificationSchema, type APINotification } from '@workspace/contract/api-types';
import { libraryKey } from '@/features/library/use-library-list';
import { useRetry } from '@/features/library/use-play';
import { openSocket } from '@/lib/socket';

/**
 * Keeps a socket open while the calling component is mounted. Only the signed-in layout calls
 * this, so there is no socket before login, and leaving that layout closes it.
 *
 * A finished or failed transcode refreshes every library query, so cards and pages show the new
 * status without polling, and shows a toast: Play for a ready title, and the reason with Retry for
 * a failed one.
 */
export const useNotifications = () => {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const retry = useRetry();

	const showRef = useRef<(notification: APINotification) => void>(undefined);
	useEffect(() => {
		showRef.current = (notification) => {
			void queryClient.invalidateQueries({ queryKey: libraryKey });
			const { id, title } = notification.data;

			if (notification.type === 'transcode:ready') {
				toast.success(`Playback for ${title} is ready!`, {
					closeButton: true,
					action:
						id === null
							? undefined
							: { label: 'Play', onClick: () => void navigate({ to: '/watch/$id', params: { id } }) },
				});
				return;
			}
			toast.error(`Playback preparation for ${title} failed.`, {
				description: notification.data.error,
				closeButton: true,
				action: id === null ? undefined : { label: 'Retry', onClick: () => retry({ id, title }) },
			});
		};
	});

	useEffect(() => {
		const socket = openSocket();
		socket.on('notification', (payload: unknown) => {
			const { success, data } = apiNotificationSchema.safeParse(payload);
			if (success) showRef.current?.(data);
		});
		return () => {
			socket.disconnect();
		};
	}, []);
};
