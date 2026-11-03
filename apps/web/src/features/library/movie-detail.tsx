import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@workspace/api-client';
import type { MovieMetadata } from '@workspace/contract/api-types';
import { Button } from '@workspace/ui/components/button';
import { AppLink } from '@workspace/ui/patterns/link';
import { MediaHero } from '@workspace/ui/patterns/media-hero';
import { BackLink, PageContainer } from '@workspace/ui/patterns/page';
import { EmptyState } from '@workspace/ui/patterns/states';
import { PlayButton } from '@workspace/ui/patterns/status';
import { movieQuery } from '@/features/library/movies';
import { usePlay, useRetry } from '@/features/library/use-play';
import { movieImageUrl } from '@/lib/api';

const formatRuntime = (minutes: number) => {
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return hours === 0 ? `${rest}m` : rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};

/** The year, runtime, rating and genres that TMDB knows, leaving out what it does not. */
const toMeta = ({ release_date, runtime, vote_average, genres }: MovieMetadata['details']) =>
	[
		release_date?.slice(0, 4),
		runtime ? formatRuntime(runtime) : undefined,
		vote_average ? vote_average.toFixed(1) : undefined,
		genres?.length ? genres.map(({ name }) => name).join(', ') : undefined,
	].filter((item): item is string => Boolean(item));

/** A movie's page: its backdrop, poster and details, with Play, or Retry for a failed title. */
export const MovieDetail = ({ id }: { id: number }) => {
	const { data, error, refetch } = useQuery(movieQuery(id));
	const play = usePlay();
	const retry = useRetry();

	if (error instanceof ApiError && error.code === 'not_found') {
		return (
			<PageContainer>
				<EmptyState
					title="This movie is not in the library"
					description="It may have been removed, or the link may be wrong."
					action={<Button render={<AppLink href="/movies" />}>Browse movies</Button>}
				/>
			</PageContainer>
		);
	}

	const back = (
		<PageContainer className="pb-0 md:pb-0">
			<BackLink href="/movies" label="Movies" />
		</PageContainer>
	);

	if (error) {
		return (
			<>
				{back}
				<MediaHero
					error={{ title: 'Could not load this movie', description: error.message, onRetry: () => void refetch() }}
				/>
			</>
		);
	}
	if (!data) {
		return (
			<>
				{back}
				<MediaHero loading />
			</>
		);
	}

	const { details, transcodeStatus: status = 'not ready', transcodeError } = data.metadata;
	const title = { id, title: details.title };

	return (
		<>
			{back}
			<MediaHero
				title={details.title}
				tagline={details.tagline || undefined}
				meta={toMeta(details)}
				overview={details.overview || undefined}
				backdrop={movieImageUrl(id, 'backdrop')}
				poster={movieImageUrl(id, 'poster')}
				status={status}
				failureReason={transcodeError}
				actions={
					<PlayButton title={details.title} status={status} onPlay={() => play(title)} onRetry={() => retry(title)} />
				}
			/>
		</>
	);
};
