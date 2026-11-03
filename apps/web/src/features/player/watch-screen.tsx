import { useQuery } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import { ApiError } from '@workspace/api-client';
import type { TranscodeStatus } from '@workspace/contract/api-types';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { PageContainer, PageHeader } from '@workspace/ui/patterns/page';
import { EmptyState, ErrorState, LoadingStatus } from '@workspace/ui/patterns/states';
import { PlayButton, StatusBadge } from '@workspace/ui/patterns/status';
import { VideoPlayer } from '@workspace/ui/patterns/video-player';
import { CircleDashed } from 'lucide-react';
import type { ReactNode } from 'react';
import { MovieNotFound } from '@/features/library/movie-not-found';
import { movieQuery } from '@/features/library/movies';
import { usePlay, useRetry } from '@/features/library/use-play';
import { playlistQuery } from '@/features/player/queries';
import { movieImageUrl } from '@/lib/api';

const isNotFound = (error: unknown) => error instanceof ApiError && error.code === 'not_found';

/** The player's box, so that loading, a title that is not ready and the video take the same place. */
const Stage = ({ children }: { children: ReactNode }) => (
	<div className="flex min-h-64 w-full flex-col justify-center overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 md:aspect-video">
		{children}
	</div>
);

const notReadyText: Record<Exclude<TranscodeStatus, 'ready'>, string> = {
	'not ready': 'It has not been prepared for playback yet. Play prepares it, and you are told when it is ready.',
	'in progress': 'It is being prepared for playback. It plays here once it is ready.',
	failed: 'Preparing it failed. Retry prepares it again.',
};

type NotReadyProps = {
	id: number;
	title: string;
	status: Exclude<TranscodeStatus, 'ready'>;
	failureReason?: string;
};

/** A title the player cannot play yet: its status, and Play to prepare it, or Retry for a failure. */
const NotReady = ({ id, title, status, failureReason }: NotReadyProps) => {
	const play = usePlay();
	const retry = useRetry();
	const reason = status === 'failed' ? failureReason : undefined;
	const movie = { id, title };

	return (
		<Stage>
			<EmptyState
				icon={CircleDashed}
				title={`${title} is not ready to play`}
				description={
					<>
						{notReadyText[status]}
						{reason ? <span className="mt-2 block break-words text-foreground">{reason}</span> : null}
					</>
				}
				action={
					<div className="flex flex-wrap items-center justify-center gap-3">
						<StatusBadge status={status} failureReason={reason} />
						<PlayButton title={title} status={status} onPlay={() => play(movie)} onRetry={() => retry(movie)} />
					</div>
				}
			/>
		</Stage>
	);
};

/**
 * `/watch/$id`: the title's name, a way back to its page, and the player. The playlist is asked for
 * only once the title is ready, and a notification refreshes the title, so a title being prepared
 * starts to play here when it is ready.
 */
export const WatchScreen = ({ id }: { id: number }) => {
	const { onSessionLost } = useRouteContext({ from: '/_app' });
	const movie = useQuery(movieQuery(id));
	const metadata = movie.data?.metadata;
	const status = metadata?.transcodeStatus ?? 'not ready';
	const playlist = useQuery({ ...playlistQuery(id), enabled: status === 'ready' });

	if (isNotFound(movie.error)) return <MovieNotFound />;

	if (movie.error) {
		return (
			<PageContainer>
				<ErrorState
					title="Could not load this movie"
					description={movie.error.message}
					onRetry={() => void movie.refetch()}
				/>
			</PageContainer>
		);
	}

	const loading = (
		<LoadingStatus label="Loading the player">
			<Skeleton className="aspect-video w-full rounded-xl" />
		</LoadingStatus>
	);

	if (!metadata) return <PageContainer>{loading}</PageContainer>;

	const { title } = metadata.details;
	let stage: ReactNode;
	if (status !== 'ready' || isNotFound(playlist.error)) {
		// A playlist that is gone means the title is no longer prepared, whatever the page last heard.
		const shown = status === 'ready' ? 'not ready' : status;
		stage = <NotReady id={id} title={title} status={shown} failureReason={metadata.transcodeError} />;
	} else if (playlist.error) {
		stage = (
			<Stage>
				<ErrorState
					title="Could not load this title"
					description={playlist.error.message}
					onRetry={() => void playlist.refetch()}
				/>
			</Stage>
		);
	} else if (!playlist.data) {
		stage = loading;
	} else {
		stage = (
			<VideoPlayer
				src={playlist.data.playlistUrl}
				title={title}
				poster={movieImageUrl(id, 'backdrop')}
				// eslint-disable-next-line turbo/no-undeclared-env-vars -- Vite sets DEV, and it is false in a build.
				debug={import.meta.env.DEV}
				onUnauthorized={onSessionLost}
				// The player shows the error in place of the video.
				onFatalError={() => {}}
				className="rounded-xl"
			/>
		);
	}

	return (
		<PageContainer>
			<PageHeader title={title} back={{ href: `/movies/${id}`, label: 'Movie details' }} />
			{stage}
		</PageContainer>
	);
};
