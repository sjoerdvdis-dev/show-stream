'use client';

import useSWR from 'swr';
import MediaCardContainer from '@/components/media/media-card-container';
import MediaCard from '@/components/media/media-card';
import LoadingCircle from '@/components/icons/loading-circle';
import { MediaPageContainer, MediaPageHeader, MediaPageBrowseBar } from '@/components/media/media-page';
import { Filter, Search, Sort } from '@/components/media/media-browser';
import { useActiveFilterCount, useSearchTerm } from '@/hooks/use-media-browser';
import {
	useFilterMovies,
	useMoviesFilterInput,
	useMoviesBrowserContext,
	useSortMovies,
} from '@/hooks/use-movies-browser';
import type { MoviesAPIData } from '@workspace/types/api-types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MoviesPage() {
	const { data, isLoading } = useSWR<MoviesAPIData>('/api/movies', fetcher, { refreshInterval: 1000 });

	const { searchState, sortState, filterSelectionState, filterSelectedState } = useMoviesBrowserContext();
	const searchTerm = useSearchTerm(searchState);
	const filterInput = useMoviesFilterInput(data?.movies || []);
	const activeFilterCount = useActiveFilterCount(filterInput, filterSelectionState);
	const filteredMovies = useFilterMovies(data?.movies || [], searchTerm, filterInput, filterSelectedState);
	const sortedMovies = useSortMovies(filteredMovies, sortState.sortOption);

	if (!data || isLoading) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				<LoadingCircle size="64" />
			</div>
		);
	}

	return (
		<MediaPageContainer>
			<MediaPageHeader header="Movies" />
			<MediaPageBrowseBar
				search={<Search {...searchState} media="movies" />}
				sort={<Sort {...sortState} />}
				filter={
					<Filter
						input={filterInput}
						selection={filterSelectionState}
						activeFiltersCount={activeFilterCount}
						applyFilter={() => filterSelectedState.applyFilter(filterSelectionState.getState())}
					/>
				}
			/>
			<MediaCardContainer>
				{sortedMovies.map((movie) => (
					<MediaCard
						key={movie.details.id}
						transcodeStatus={movie.transcodeStatus || 'not ready'}
						mediaType="movie"
						{...movie.details}
					/>
				))}
			</MediaCardContainer>
		</MediaPageContainer>
	);
}
