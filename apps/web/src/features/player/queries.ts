import { queryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** The playlist of a prepared title. `/dev/components` plays it too. */
export const playlistQuery = (id: number) =>
	queryOptions({
		queryKey: ['playlist', id],
		queryFn: () => api.transcodePlaylist({ params: { id } }),
		// Asking counts as playing, and the file does not move.
		staleTime: Infinity,
	});
