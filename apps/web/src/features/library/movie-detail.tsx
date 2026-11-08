import { useQuery } from '@tanstack/react-query';
import type { LibraryMovie } from '@workspace/contract/library';
import { MediaHero } from '@workspace/ui/patterns/media-hero';
import { BackLink, PageContainer } from '@workspace/ui/patterns/page';
import { PlayButton } from '@workspace/ui/patterns/status';
import { MovieNotFound } from '@/features/library/movie-not-found';
import { movieArt, movieQuery } from '@/features/library/movies';
import { usePlay, useRetry } from '@/features/library/use-play';
import { isNotFound } from '@/lib/api';

const formatRuntime = (minutes: number) => {
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return hours === 0 ? `${rest}m` : rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};

/** The year, runtime, rating and genres that TMDB knows, leaving out what it does not. */
const toMeta = ({ year, runtime, rating, genres }: LibraryMovie) =>
	[
		year ? String(year) : undefined,
		runtime ? formatRuntime(runtime) : undefined,
		rating ? rating.toFixed(1) : undefined,
		genres.length ? genres.join(', ') : undefined,
	].filter((item): item is string => Boolean(item));

/** A movie's page: its backdrop, poster and details, with Play, or Retry for a failed title. */
export const MovieDetail = ({ id }: { id: number }) => {
	const { data, error, refetch } = useQuery(movieQuery(id));
	const play = usePlay();
	const retry = useRetry();

	if (isNotFound(error)) return <MovieNotFound />;

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

	const { status, failureReason } = data;
	const title = { id, title: data.title };

	return (
		<>
			{back}
			<MediaHero
				title={data.title}
				tagline={data.tagline ?? undefined}
				meta={toMeta(data)}
				overview={data.overview ?? undefined}
				backdrop={movieArt(data, 'backdrop')}
				poster={movieArt(data, 'poster')}
				status={status}
				failureReason={failureReason}
				actions={
					<PlayButton title={data.title} status={status} onPlay={() => play(title)} onRetry={() => retry(title)} />
				}
			/>
		</>
	);
};
