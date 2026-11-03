import { endpoints } from '@workspace/contract/endpoints';
import type { LibraryQuery, LibrarySort, SortOrder } from '@workspace/contract/library';

/**
 * A library's state in the URL: the contract's library query, with every value optional. A value
 * left out is the default, so the defaults never appear in the URL.
 */
export type LibrarySearch = Partial<LibraryQuery>;

const querySchema = endpoints.libraryMovies.query;

/** What the API uses when a value is left out. */
export const libraryDefaults = querySchema.parse({}) as Pick<LibraryQuery, 'sort' | 'order' | 'page' | 'pageSize'>;

type Key = keyof LibraryQuery;

const isDefault = (key: Key, value: unknown) =>
	key in libraryDefaults && libraryDefaults[key as keyof typeof libraryDefaults] === value;

/**
 * Reads a library's search params with the contract's schema. Each value is checked on its own,
 * so one bad value falls back to its default and keeps the rest, and a reversed range drops its
 * start. Unknown keys are dropped too.
 */
export const validateLibrarySearch = (raw: Record<string, unknown>): LibrarySearch => {
	const search: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(raw)) {
		const parsed = querySchema.safeParse({ [key]: value });
		if (parsed.success && key in parsed.data) {
			search[key] = parsed.data[key as Key];
		}
	}

	// What is left can only fail as a whole, on a reversed range.
	const whole = querySchema.safeParse(search);
	if (!whole.success) {
		for (const issue of whole.error.issues) {
			delete search[String(issue.path[0])];
		}
	}

	// The router lays this over the raw search, so a value dropped here must be there as undefined.
	const result: Record<string, unknown> = {};
	for (const key of Object.keys(raw)) {
		const value = search[key];
		result[key] = value === undefined || isDefault(key as Key, value) ? undefined : value;
	}
	return result as LibrarySearch;
};

/** A numeric range in the Filters panel: a slider over one of the library's facets, held in two search keys. */
export type RangeFilterSpec = {
	label: string;
	facet: 'year' | 'runtime' | 'rating';
	min: Extract<Key, `${string}Min`>;
	max: Extract<Key, `${string}Max`>;
	step: number;
	/** The URL keeps a value rounded to this many decimals. */
	decimals: number;
	format: (value: number) => string;
};

/** The numeric ranges, by facet. The release date is a range of dates, with a control of its own. */
export const rangeFilters = {
	year: { label: 'Year', facet: 'year', min: 'yearMin', max: 'yearMax', step: 1, decimals: 0, format: String },
	runtime: {
		label: 'Runtime',
		facet: 'runtime',
		min: 'runtimeMin',
		max: 'runtimeMax',
		step: 5,
		decimals: 0,
		format: (minutes) => `${minutes} min`,
	},
	rating: {
		label: 'Rating',
		facet: 'rating',
		min: 'ratingMin',
		max: 'ratingMax',
		step: 0.1,
		decimals: 1,
		format: (value) => value.toFixed(1),
	},
} satisfies { [F in RangeFilterSpec['facet']]: RangeFilterSpec & { facet: F } };

const ranges: RangeFilterSpec[] = Object.values(rangeFilters);

/** The filters a user sets in the Filters panel, apart from search and sort. */
export const filterKeys: Key[] = [
	...ranges.flatMap(({ min, max }) => [min, max]),
	'releaseDateFrom',
	'releaseDateTo',
	'genre',
	'status',
];

/** How many filter groups are set: a range counts once, whichever end is set. */
export const countActiveFilters = (search: LibrarySearch) =>
	[
		...ranges.map(({ min, max }) => search[min] !== undefined || search[max] !== undefined),
		search.releaseDateFrom !== undefined || search.releaseDateTo !== undefined,
		Boolean(search.genre?.length),
		Boolean(search.status?.length),
	].filter(Boolean).length;

/** One choice of order. The sort and its direction travel together, as `title:asc`. */
export type SortChoice = `${LibrarySort}:${SortOrder}`;

export const sortChoices: { value: SortChoice; label: string }[] = [
	{ value: 'title:asc', label: 'Title, A to Z' },
	{ value: 'title:desc', label: 'Title, Z to A' },
	{ value: 'year:desc', label: 'Year, newest first' },
	{ value: 'year:asc', label: 'Year, oldest first' },
	{ value: 'releaseDate:desc', label: 'Release date, newest first' },
	{ value: 'releaseDate:asc', label: 'Release date, oldest first' },
	{ value: 'rating:desc', label: 'Rating, highest first' },
	{ value: 'rating:asc', label: 'Rating, lowest first' },
	{ value: 'runtime:asc', label: 'Runtime, shortest first' },
	{ value: 'runtime:desc', label: 'Runtime, longest first' },
	{ value: 'popularity:desc', label: 'Most popular first' },
	{ value: 'popularity:asc', label: 'Least popular first' },
];

export const toSortChoice = ({ sort = libraryDefaults.sort, order = libraryDefaults.order }: LibrarySearch) =>
	`${sort}:${order}` as SortChoice;

export const fromSortChoice = (choice: SortChoice) => {
	const [sort, order] = choice.split(':') as [LibrarySort, SortOrder];
	return { sort, order };
};
