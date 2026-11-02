import { queryOptions, useQuery } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import { ApiError } from '@workspace/api-client';
import { HlsPlayer } from '@/features/player/hls-player';
import { api } from '@/lib/api';

const playlistQuery = (id: number) =>
	queryOptions({
		queryKey: ['playlist', id],
		queryFn: () => api.transcodePlaylist({ params: { id } }),
		// Asking counts as playing, and the file does not move.
		staleTime: Infinity,
	});

/** Thin on purpose. Phase 2 item 6 replaces this. It plays what is prepared, and prepares nothing. */
export const Player = ({ id }: { id: number }) => {
	const { onSessionLost } = useRouteContext({ from: '/_app' });
	const { data, error, isPending } = useQuery(playlistQuery(id));

	if (isPending) return <p>Loading…</p>;
	if (error) {
		const notReady = error instanceof ApiError && error.code === 'not_found';
		return <p role="alert">{notReady ? 'This title is not ready to play.' : 'Could not load this title.'}</p>;
	}

	return <HlsPlayer playlistUrl={data.playlistUrl} onSessionLost={onSessionLost} />;
};
