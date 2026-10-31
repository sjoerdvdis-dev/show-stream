'use client';

import { createContext, useContext, useMemo } from 'react';
import {
	FilterInput,
	FilterSelectedState,
	FilterSelectionState,
	FilterState,
	SearchState,
	SortBy,
	SortOption,
	SortOrder,
	SortState,
	useFilterSelectedStore,
	useFilterSelectionStore,
	useSearchStore,
	useSortStore,
} from './use-media-browser';
import type { MoviesAPIData } from '@workspace/types/api-types';

interface MoviesBrowserContextState {
	searchState: SearchState;
	sortState: SortState;
	filterSelectionState: FilterSelectionState;
	filterSelectedState: FilterSelectedState;
}

const MoviesBrowserContext = createContext<MoviesBrowserContextState | null>(null);

export function MoviesBrowserContextProvider({ children }: { children: React.ReactNode }) {
	const searchState = useSearchStore();
	const sortState = useSortStore();
	const filterSelectionState = useFilterSelectionStore();
	const filterSelectedState = useFilterSelectedStore();

	const value = {
		searchState,
		sortState,
		filterSelectionState,
		filterSelectedState,
	};

	return <MoviesBrowserContext.Provider value={value}>{children}</MoviesBrowserContext.Provider>;
}

export function useMoviesBrowserContext() {
	const context = useContext(MoviesBrowserContext);
	if (!context) {
		throw new Error('useMoviesBrowserContext must be used within a MoviesBrowserContextProvider');
	}
	return context;
}

export function useMoviesFilterInput(movies: MoviesAPIData['movies']): FilterInput {
	return useMemo((): FilterInput => {
		const genres = new Set<string>();
		const studios = new Set<string>();
		const runtimes = new Array<number>();
		const votes = new Array<number>();

		for (const movie of movies) {
			movie.details.genres.forEach((genre) => genres.add(genre.name));
			movie.details.production_companies.forEach((company) => studios.add(company.name));
			runtimes.push(movie.details.runtime);
			votes.push(movie.details.vote_count);
		}

		return {
			genres: Array.from(genres).sort(),
			studios: Array.from(studios).sort(),
			transcodeStatuses: ['all', 'ready', 'not ready', 'in progress'],
			runtimes: [0, Math.ceil(Math.max(...runtimes) / 100) * 100],
			votes: [0, Math.ceil(Math.max(...votes) / 1000) * 1000],
		};
	}, [movies]);
}

export function useSortMovies(movies: MoviesAPIData['movies'], sortOption?: SortOption) {
	return useMemo(() => {
		if (!sortOption) {
			return movies;
		}

		const { sortBy, sortOrder } = sortOption;

		return movies.sort((a, b) => {
			let aValue: string | number;
			let bValue: string | number;

			switch (sortBy) {
				case SortBy.Title:
					aValue = a.details.title.toLowerCase();
					bValue = b.details.title.toLowerCase();
					break;
				case SortBy.ReleaseDate:
					aValue = new Date(a.details.release_date).getTime();
					bValue = new Date(b.details.release_date).getTime();
					break;
				case SortBy.Runtime:
					aValue = a.details.runtime;
					bValue = b.details.runtime;
					break;
				case SortBy.Score:
					aValue = a.details.vote_average;
					bValue = b.details.vote_average;
					break;
				case SortBy.Votes:
					aValue = a.details.vote_count;
					bValue = b.details.vote_count;
					break;
			}

			if (aValue < bValue) {
				return sortOrder === SortOrder.Asc ? -1 : 1;
			}
			if (aValue > bValue) {
				return sortOrder === SortOrder.Asc ? 1 : -1;
			}
			return 0;
		});
	}, [movies, sortOption]);
}

export function useFilterMovies(
	movies: MoviesAPIData['movies'],
	searchTerm: string,
	input: FilterInput,
	filter: FilterState,
) {
	const applySearchFilter = useMemo(() => {
		return (movies: MoviesAPIData['movies']) => {
			const term = searchTerm.toLowerCase();

			if (!term.trim()) {
				return movies;
			}

			return movies.filter(
				(movie) =>
					movie.details.title.toLowerCase().includes(term) || movie.details.overview.toLowerCase().includes(term),
			);
		};
	}, [searchTerm]);

	const applyGenreFilter = useMemo(() => {
		return (movies: MoviesAPIData['movies']) => {
			if (!filter.genres || filter.genres.length === 0) {
				return movies;
			}

			return movies.filter((movie) =>
				filter.genres.every((genre) => movie.details.genres.some((g) => g.name === genre)),
			);
		};
	}, [filter.genres]);

	const applyStudioFilter = useMemo(() => {
		return (movies: MoviesAPIData['movies']) => {
			if (!filter.studios || filter.studios.length === 0) {
				return movies;
			}

			return movies.filter((movie) =>
				filter.studios.every((studio) => movie.details.production_companies.some((company) => company.name === studio)),
			);
		};
	}, [filter.studios]);

	const applyReleaseDateFilter = useMemo(() => {
		return (movies: MoviesAPIData['movies']) => {
			const { start, end } = filter.releaseDates;

			if (!start && !end) {
				return movies;
			}

			return movies.filter((movie) => {
				const releaseDate = new Date(movie.details.release_date);

				if (start && releaseDate < start) {
					return false;
				}

				if (end && releaseDate > end) {
					return false;
				}

				return true;
			});
		};
	}, [filter.releaseDates]);

	const applyRuntimesFilter = useMemo(() => {
		return (movies: MoviesAPIData['movies']) => {
			if (!filter.runtimes) {
				return movies;
			}

			const [inputMin, inputMax] = input.runtimes;
			const [filterMin, filterMax] = filter.runtimes;

			if (filterMin !== undefined && filterMin != inputMin) {
				movies = movies.filter((movie) => movie.details.runtime >= filterMin);
			}

			if (filterMax !== undefined && filterMax != inputMax) {
				movies = movies.filter((movie) => movie.details.runtime <= filterMax);
			}

			return movies;
		};
	}, [input.runtimes, filter.runtimes]);

	const applyScoresFilter = useMemo(() => {
		return (movies: MoviesAPIData['movies']) => {
			if (!filter.scores) {
				return movies;
			}

			const [inputMin, inputMax] = [1, 10];
			const [filterMin, filterMax] = filter.scores;

			if (filterMin !== undefined && filterMin != inputMin) {
				movies = movies.filter((movie) => movie.details.vote_average >= filterMin);
			}

			if (filterMax !== undefined && filterMax != inputMax) {
				movies = movies.filter((movie) => movie.details.vote_average <= filterMax);
			}

			return movies;
		};
	}, [filter.scores]);

	const applyVotesFilter = useMemo(() => {
		return (movies: MoviesAPIData['movies']) => {
			if (!filter.votes) {
				return movies;
			}

			const [inputMin, inputMax] = input.votes;
			const [filterMin, filterMax] = filter.votes;

			if (filterMin !== undefined && filterMin != inputMin) {
				movies = movies.filter((movie) => movie.details.vote_count >= filterMin);
			}

			if (filterMax !== undefined && filterMax != inputMax) {
				movies = movies.filter((movie) => movie.details.vote_count <= filterMax);
			}

			return movies;
		};
	}, [input.votes, filter.votes]);

	const applyTranscodeStatusFilter = useMemo(() => {
		return (movies: MoviesAPIData['movies']) => {
			if (filter.transcodeStatus === 'all') {
				return movies;
			}

			return movies.filter((movie) => (movie.transcodeStatus || 'not ready') === filter.transcodeStatus);
		};
	}, [filter.transcodeStatus]);

	return useMemo(() => {
		let filteredMovies = movies;

		for (const applyMoviesFilter of [
			applySearchFilter,
			applyGenreFilter,
			applyStudioFilter,
			applyReleaseDateFilter,
			applyRuntimesFilter,
			applyScoresFilter,
			applyVotesFilter,
			applyTranscodeStatusFilter,
		]) {
			filteredMovies = applyMoviesFilter(filteredMovies);
		}

		return filteredMovies;
	}, [
		movies,
		applySearchFilter,
		applyGenreFilter,
		applyStudioFilter,
		applyReleaseDateFilter,
		applyRuntimesFilter,
		applyScoresFilter,
		applyVotesFilter,
		applyTranscodeStatusFilter,
	]);
}
