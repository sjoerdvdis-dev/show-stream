'use client';

import { create } from 'zustand';
import { useDebounce } from 'use-debounce';
import { useMemo } from 'react';
import { TranscodeStatus } from '@workspace/types/db-types';

export interface DateRange {
	start?: Date;
	end?: Date;
}

export type SliderRange = [number, number] | undefined;

export interface SearchState {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
}

export enum SortBy {
	Title = 'title',
	Votes = 'popularity',
	ReleaseDate = 'release date',
	Score = 'score',
	Runtime = 'runtime',
}
export enum SortOrder {
	Asc = 'ascending',
	Desc = 'descending',
}
export interface SortOption {
	label: string;
	sortBy: SortBy;
	sortOrder: SortOrder;
}

export function getSortOptions(): SortOption[] {
	const options: SortOption[] = [];
	for (const sortBy of Object.values(SortBy)) {
		for (const sortOrder of Object.values(SortOrder)) {
			options.push({
				label: getSortLabel({ sortBy, sortOrder }),
				sortBy,
				sortOrder,
			});
		}
	}
	return options;
}
function getSortLabel(option: { sortBy: SortBy; sortOrder: SortOrder }): string {
	return `${option.sortBy} ${getSortAdditionalLabel(option)}`;
}
function getSortAdditionalLabel(option: { sortBy: SortBy; sortOrder: SortOrder }): string {
	switch (option.sortBy) {
		case SortBy.Title:
			return option.sortOrder === SortOrder.Asc ? 'A-Z (Ascending)' : 'Z-A (Descending)';
		default:
			return `(${option.sortOrder})`;
	}
}

export interface SortState {
	sortOption?: SortOption;
	sortOptions: SortOption[];
	setSortOption: (option?: SortOption) => void;
}

export interface FilterInput {
	genres: string[];
	studios: string[];
	transcodeStatuses: (TranscodeStatus | 'all')[];
	runtimes: [number, number];
	votes: [number, number];
}

export interface FilterState {
	genres: string[];
	studios: string[];
	releaseDates: DateRange;
	transcodeStatus: TranscodeStatus | 'all';
	runtimes: SliderRange;
	scores: SliderRange;
	votes: SliderRange;
}

export type FilterSelectionState = FilterState & {
	setGenre: (genre: string) => void;
	setStudio: (studio: string) => void;
	setReleaseDate: (dates: { start?: Date; end?: Date }) => void;
	setTranscodeStatus: (status: TranscodeStatus | 'all') => void;
	setRuntimes: (runtime: SliderRange) => void;
	setScores: (scores: SliderRange) => void;
	setVotes: (votes: SliderRange) => void;
	clearGenres: () => void;
	clearStudios: () => void;
	clearReleaseDates: () => void;
	clearTranscodeStatus: () => void;
	clearRuntimes: () => void;
	clearScores: () => void;
	clearVotes: () => void;
	clearSelections: () => void;
	getState: () => FilterState;
};

export type FilterSelectedState = FilterState & {
	applyFilter: (selection: FilterState) => void;
};

export const useSearchStore = create<SearchState>((set) => ({
	searchQuery: '',
	setSearchQuery: (query: string) => set({ searchQuery: query }),
}));

export function useSearchTerm(state: SearchState): string {
	const [searchTerm] = useDebounce(state.searchQuery, 250);
	return searchTerm;
}

const sortOptions = getSortOptions();
export const useSortStore = create<SortState>((set) => ({
	sortOption: sortOptions[0],
	sortOptions,
	setSortOption: (sortOption) => set({ sortOption }),
}));

export const useFilterSelectionStore = create<FilterSelectionState>((set, get) => ({
	genres: [],
	studios: [],
	releaseDates: {},
	transcodeStatus: 'all',
	runtimes: undefined,
	scores: undefined,
	votes: undefined,
	setGenre: (genre) =>
		set(({ genres }) => ({
			genres: genres.includes(genre) ? genres.filter((g) => g !== genre) : [...genres, genre],
		})),
	setStudio: (studio) =>
		set(({ studios }) => ({
			studios: studios.includes(studio) ? studios.filter((s) => s !== studio) : [...studios, studio],
		})),
	setReleaseDate: (dates) =>
		set(({ releaseDates }) => ({
			releaseDates: { start: dates.start ?? releaseDates.start, end: dates.end ?? releaseDates.end },
		})),
	setTranscodeStatus: (transcodeStatus) => set({ transcodeStatus }),
	setRuntimes: (runtimes) => set({ runtimes }),
	setScores: (scores) => set({ scores }),
	setVotes: (votes) => set({ votes }),
	clearGenres: () => set({ genres: [] }),
	clearStudios: () => set({ studios: [] }),
	clearReleaseDates: () => set({ releaseDates: {} }),
	clearTranscodeStatus: () => set({ transcodeStatus: 'all' }),
	clearRuntimes: () => set({ runtimes: undefined }),
	clearScores: () => set({ scores: undefined }),
	clearVotes: () => set({ votes: undefined }),
	clearSelections: () => {
		const {
			clearGenres,
			clearStudios,
			clearReleaseDates,
			clearTranscodeStatus,
			clearRuntimes,
			clearScores,
			clearVotes,
		} = get();
		clearGenres();
		clearStudios();
		clearReleaseDates();
		clearTranscodeStatus();
		clearRuntimes();
		clearScores();
		clearVotes();
	},
	getState: () => get(),
}));

export const useFilterSelectedStore = create<FilterSelectedState>((set) => ({
	genres: [],
	studios: [],
	releaseDates: {},
	transcodeStatus: 'all',
	runtimes: undefined,
	scores: undefined,
	votes: undefined,
	applyFilter: (selection) => set({ ...selection }),
}));

export function useActiveFilterCount(input: FilterInput, state: FilterState): number {
	return useMemo(() => {
		let count = 0;
		if (state.genres.length > 0) count++;
		if (state.studios.length > 0) count++;
		if (state.releaseDates.start || state.releaseDates.end) count++;
		if (state.transcodeStatus !== 'all') count++;
		if (state.runtimes && !compareSliderRange(input.runtimes, state.runtimes)) count++;
		if (state.scores && !compareSliderRange([1, 10], state.scores)) count++;
		if (state.votes && !compareSliderRange(input.votes, state.votes)) count++;
		return count;
	}, [state]);
}

function compareSliderRange(a: SliderRange, b: SliderRange): boolean {
	if (!a || !b) return false;
	return a[0] === b[0] && a[1] === b[1];
}
