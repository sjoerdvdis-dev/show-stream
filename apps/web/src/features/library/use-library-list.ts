import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ImageKind, LibraryFacets, LibraryPage, LibraryQueryInput } from '@workspace/contract/library';
import { useEffect, useRef, useState } from 'react';
import { countActiveFilters, filterKeys, libraryDefaults, type LibrarySearch } from '@/features/library/library-search';

/** Every query of the library starts with this, so that a notification can refresh them all. */
export const libraryKey = ['library'] as const;

/** One media type's library: how to ask the API for it, and where its titles and art are. */
export type LibrarySource = {
	/** Tells this library's queries apart from another's, such as `movies`. */
	key: string;
	list: (query: LibraryQueryInput) => Promise<LibraryPage>;
	facets: () => Promise<LibraryFacets>;
	/** A title's page in the app. */
	href: (id: number) => string;
	imageUrl: (id: number, kind: ImageKind) => string;
};

/** Changes the URL's search. `replace` changes the current history entry instead of adding one. */
export type SearchUpdater = (
	update: (previous: LibrarySearch) => LibrarySearch,
	options?: { replace?: boolean },
) => void;

/** How long typing waits before it searches, and a slider before it filters. */
export const settleMs = 300;

/** Waits until `value` has stopped changing for `settleMs`, then calls `commit` with it. */
const useSettled = <T>(value: T | undefined, commit: (value: T) => void) => {
	const commitRef = useRef(commit);
	useEffect(() => {
		commitRef.current = commit;
	});
	useEffect(() => {
		if (value === undefined) return;
		const timer = setTimeout(() => commitRef.current(value), settleMs);
		return () => clearTimeout(timer);
	}, [value]);
};

/** Lays a change of filters or sort over the search, and goes back to the first page. */
const applyFilters = (patch: LibrarySearch) => (previous: LibrarySearch) => ({
	...previous,
	...patch,
	page: undefined,
});

const withoutFilters = (search: LibrarySearch) => {
	const rest = { ...search };
	for (const key of filterKeys) delete rest[key];
	return rest;
};

/**
 * A library screen's state and data, from its URL search: the page of titles, the facets, and the
 * changes a user makes. Any filter change goes back to the first page. Typing in search waits until
 * it settles and replaces the history entry, so Back skips the keystrokes. Each other change adds
 * an entry, so Back undoes it. Movies use it today, and Shows will in Phase 6.
 */
export const useLibraryList = ({
	source,
	search,
	onSearchChange,
}: {
	source: LibrarySource;
	search: LibrarySearch;
	onSearchChange: SearchUpdater;
}) => {
	const results = useQuery({
		queryKey: [...libraryKey, source.key, 'list', search],
		queryFn: () => source.list(search),
		// The last page stays on screen while the next one loads, so the grid does not flash.
		placeholderData: keepPreviousData,
	});
	const facets = useQuery({ queryKey: [...libraryKey, source.key, 'facets'], queryFn: source.facets });

	// The search box's text, which leads the URL while the user types.
	const [searchText, setSearchText] = useState(search.q ?? '');
	const [pendingText, setPendingText] = useState<string>();
	// The search last seen in the URL. When Back, or a link, changes it, the box follows, unless it is
	// the search the box itself just sent, which the user may already have typed past.
	const [seenQ, setSeenQ] = useState(search.q);
	const [sentQ, setSentQ] = useState<{ q: string | undefined }>();
	if (search.q !== seenQ) {
		setSeenQ(search.q);
		setSentQ(undefined);
		if (!sentQ || sentQ.q !== search.q) setSearchText(search.q ?? '');
	}

	useSettled(pendingText, (text) => {
		const q = text.trim() || undefined;
		setPendingText(undefined);
		if (q === search.q) return;
		setSentQ({ q });
		onSearchChange((previous) => ({ ...previous, q, page: undefined }), { replace: true });
	});

	// Filters a slider is still moving, ahead of the URL.
	const [pendingFilters, setPendingFilters] = useState<LibrarySearch>();
	useSettled(pendingFilters, (patch) => {
		setPendingFilters(undefined);
		onSearchChange(applyFilters(patch));
	});

	const shown = { ...search, ...pendingFilters };
	const page = search.page ?? libraryDefaults.page;
	const pageSize = results.data?.pageSize ?? search.pageSize ?? libraryDefaults.pageSize;

	return {
		/** The search as the controls show it, including a slider still moving. */
		search: shown,
		/** The page of titles. */
		results,
		facets,
		page,
		pageCount: results.data ? Math.max(1, Math.ceil(results.data.total / pageSize)) : 1,
		activeFilterCount: countActiveFilters(shown),
		/** Whether anything narrows the list, so that an empty list means no match rather than no titles. */
		isNarrowed: Boolean(search.q) || countActiveFilters(search) > 0,
		searchText,
		setSearchText: (text: string) => {
			setSearchText(text);
			setPendingText(text);
		},
		/** Changes filters or sort, and goes back to the first page. */
		setFilters: (patch: LibrarySearch) => onSearchChange(applyFilters(patch)),
		/** For a control that changes many times a second, such as a slider. */
		setFiltersSoon: (patch: LibrarySearch) => setPendingFilters((previous) => ({ ...previous, ...patch })),
		clearFilters: () => {
			setPendingFilters(undefined);
			onSearchChange((previous) => ({ ...withoutFilters(previous), page: undefined }));
		},
		setPage: (next: number) => onSearchChange((previous) => ({ ...previous, page: next })),
	};
};
