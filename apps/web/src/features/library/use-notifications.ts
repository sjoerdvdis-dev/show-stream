import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { apiNotificationSchema, type APINotification } from '@workspace/contract/api-types';
import { movieLibrary, movieQuery } from '@/features/library/movies';
import { libraryFacetsKey, libraryListKey } from '@/features/library/use-library-list';
import { actionToastMs, toastTranscodeFailed, useRetry } from '@/features/library/use-play';
import { openSocket } from '@/lib/socket';

/**
 * Keeps a socket open while the calling component is mounted. Only the signed-in layout calls
 * this, so there is no socket before login, and leaving that layout closes it.
 *
 * A finished or failed transcode refreshes what it can change: every page of the movie library,
 * its facets, which count titles by status, and the title's own page. So cards and pages show the
 * new status without polling. It also shows a toast: Play for a ready title, and the reason with
 * Retry for a failed one.
 */
export const useNotifications = () => {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const retry = useRetry();

	const showRef = useRef<(notification: APINotification) => void>(undefined);
	useEffect(() => {
		showRef.current = (notification) => {
			const { id, title } = notification.data;
			void queryClient.invalidateQueries({ queryKey: libraryListKey(movieLibrary) });
			void queryClient.invalidateQueries({ queryKey: libraryFacetsKey(movieLibrary) });
			if (id !== null) void queryClient.invalidateQueries({ queryKey: movieQuery(id).queryKey });

			if (notification.type === 'transcode:ready') {
				toast.success(`Playback for ${title} is ready!`, {
					closeButton: true,
					duration: actionToastMs,
					action:
						id === null
							? undefined
							: { label: 'Play', onClick: () => void navigate({ to: '/watch/$id', params: { id } }) },
				});
				return;
			}
			toastTranscodeFailed(title, notification.data.error, id === null ? undefined : () => retry({ id, title }));
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
