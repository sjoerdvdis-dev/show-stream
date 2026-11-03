import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { libraryKey } from '@/features/library/use-library-list';
import { api, isUnauthorized } from '@/lib/api';

type Title = { id: number; title: string };

/** How long a toast with an action stays, so there is time to read it and act. Hover and focus pause it. */
export const actionToastMs = 10_000;

/** A failure's reason can be a long ffmpeg message. The toast shows its start, and the title's page all of it. */
export const reasonClassNames = { description: 'line-clamp-3' };

/** A 401 already went to `onSessionLost`, through the query client, so it needs no toast. */
const toastFailure = (message: string, error: Error) => {
	if (!isUnauthorized(error)) toast.error(message, { description: error.message, closeButton: true });
};

/**
 * Retry for a failed title: it asks the API to prepare the title again, and refreshes the library,
 * so every screen shows it as being prepared.
 */
export const useRetry = () => {
	const queryClient = useQueryClient();
	const { mutate } = useMutation({
		mutationFn: ({ id }: Title) => api.transcodeRetry({ params: { id } }),
		onSuccess: (_result, { title }) => {
			toast.info(`Preparing ${title} again. You will be told when it is ready.`, { closeButton: true });
		},
		onError: (error, { title }) => toastFailure(`Could not retry ${title}.`, error),
		onSettled: () => queryClient.invalidateQueries({ queryKey: libraryKey }),
	});
	return (title: Title) => mutate(title);
};

/**
 * Play: a ready title opens the player, and any other asks the API to prepare it, which takes
 * time and ends in a notification. A failed title says why, with a Retry action.
 */
export const usePlay = () => {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const retry = useRetry();

	const { mutate } = useMutation({
		mutationFn: ({ id }: Title) => api.transcodeRequest({ params: { id } }),
		onSuccess: ({ status, error }, title) => {
			if (status === 'ready') {
				void navigate({ to: '/watch/$id', params: { id: title.id } });
				return;
			}
			if (status === 'failed') {
				toast.error(`Playback preparation for ${title.title} failed.`, {
					description: error,
					classNames: reasonClassNames,
					closeButton: true,
					duration: actionToastMs,
					action: { label: 'Retry', onClick: () => retry(title) },
				});
				return;
			}
			toast.info(`Preparing ${title.title} for playback. You will be told when it is ready.`, {
				closeButton: true,
			});
		},
		onError: (error, { title }) => toastFailure(`Could not play ${title}.`, error),
		// Asking can change the title's status, from not ready to being prepared.
		onSettled: () => queryClient.invalidateQueries({ queryKey: libraryKey }),
	});
	return (title: Title) => mutate(title);
};
