import { z } from 'zod';
import { transcodeStatusSchema } from './api-types.js';

/**
 * Library API: a paged, searchable list of one media type, its facets and its stored art.
 *
 * Query values arrive as strings, and a key that repeats arrives as a list. The helpers here
 * read them that way, while the typed client sends numbers and arrays as they are.
 */

/** Without one, an empty value such as `?yearMin=` would be a bad number rather than no filter. */
const emptyAsMissing = (value: unknown) => (value === '' ? undefined : value);

/**
 * A number in a query string. The cast keeps the client's input typed as a number, while the
 * server also accepts the string that a query string carries.
 */
const queryNumber = <T extends z.ZodType<number>>(schema: T) =>
	z.preprocess((value) => {
		const present = emptyAsMissing(value);
		return typeof present === 'string' && /^-?\d+(\.\d+)?$/.test(present) ? Number(present) : present;
	}, schema) as unknown as z.ZodType<z.output<T>, z.input<T>>;

/** Any of several values. A key given once arrives as one string. */
const queryList = <T extends z.ZodType>(item: T) =>
	z.preprocess((value) => {
		const present = emptyAsMissing(value);
		return typeof present === 'string' ? [present] : present;
	}, z.array(item).max(50, 'Give at most 50 values').optional()) as unknown as z.ZodType<
		z.output<T>[] | undefined,
		z.input<T>[] | undefined
	>;

const queryText = <T extends z.ZodType>(schema: T) =>
	z.preprocess(emptyAsMissing, schema) as unknown as z.ZodType<z.output<T>, z.input<T>>;

const isRealDate = (value: string) => {
	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

/** `YYYY-MM-DD`, as TMDB gives release dates. */
const isoDate = z
	.string({ error: 'Must be a date as YYYY-MM-DD' })
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date as YYYY-MM-DD')
	.refine(isRealDate, 'Must be a real date');

const wholeNumber = (label: string) => z.number({ error: `${label} must be a number` }).int(`${label} must be whole`);

const year = queryNumber(wholeNumber('Year').min(0).max(9999)).optional();
const runtime = queryNumber(wholeNumber('Runtime').min(0, 'Runtime cannot be negative')).optional();
const rating = queryNumber(
	z.number({ error: 'Rating must be a number' }).min(0, 'Rating is from 0 to 10').max(10, 'Rating is from 0 to 10'),
).optional();
const date = queryText(isoDate).optional();

export const librarySortKeys = ['title', 'year', 'releaseDate', 'runtime', 'rating', 'popularity'] as const;
export const librarySortSchema = z.enum(librarySortKeys, { error: `Sort by one of ${librarySortKeys.join(', ')}` });
export type LibrarySort = z.infer<typeof librarySortSchema>;

export const sortOrderSchema = z.enum(['asc', 'desc'], { error: 'Order must be asc or desc' });
export type SortOrder = z.infer<typeof sortOrderSchema>;

export const maxPageSize = 100;
export const defaultPageSize = 24;

const ranges = [
	['yearMin', 'yearMax'],
	['releaseDateFrom', 'releaseDateTo'],
	['runtimeMin', 'runtimeMax'],
	['ratingMin', 'ratingMax'],
] as const;

/**
 * Every filter is optional, and filters combine with AND. `genre` and `status` match any of
 * their values. Ranges include their edges. Unknown keys are refused, so that a misspelt
 * filter fails rather than quietly matching everything.
 */
export const libraryQuerySchema = z
	.strictObject({
		/** Matches the start of each word in the title, in any order. */
		q: queryText(z.string().trim().max(200, 'Search for at most 200 characters')).optional(),
		sort: queryText(librarySortSchema).default('title'),
		order: queryText(sortOrderSchema).default('asc'),
		yearMin: year,
		yearMax: year,
		releaseDateFrom: date,
		releaseDateTo: date,
		runtimeMin: runtime,
		runtimeMax: runtime,
		ratingMin: rating,
		ratingMax: rating,
		genre: queryList(z.string().min(1, 'A genre cannot be empty')),
		status: queryList(transcodeStatusSchema),
		page: queryNumber(wholeNumber('Page').min(1, 'Pages start at 1')).default(1),
		pageSize: queryNumber(
			wholeNumber('Page size').min(1, 'Page size must be at least 1').max(maxPageSize, `Page size must be at most ${maxPageSize}`),
		).default(defaultPageSize),
	})
	.superRefine((query, context) => {
		for (const [from, to] of ranges) {
			// Both ends of a range have one type, and ISO dates compare as text.
			const low = query[from] as number | undefined;
			const high = query[to] as number | undefined;
			if (low !== undefined && high !== undefined && low > high) {
				context.addIssue({ code: 'custom', path: [from], message: `${from} cannot be after ${to}` });
			}
		}
	});
export type LibraryQuery = z.output<typeof libraryQuerySchema>;
export type LibraryQueryInput = z.input<typeof libraryQuerySchema>;

/** A card's worth of a title. The TMDB payload stays on the detail endpoint. */
export const libraryItemSchema = z.object({
	/** The TMDB ID, which every other route of a movie uses. */
	id: z.number(),
	title: z.string(),
	year: z.number().nullable(),
	/** `YYYY-MM-DD`. */
	releaseDate: z.string().nullable(),
	/** Minutes. */
	runtime: z.number().nullable(),
	/** TMDB's vote average, from 0 to 10. */
	rating: z.number().nullable(),
	genres: z.array(z.string()),
	status: transcodeStatusSchema,
	hasPoster: z.boolean(),
	hasBackdrop: z.boolean(),
});
export type LibraryItem = z.infer<typeof libraryItemSchema>;

export const libraryPageSchema = z.object({
	items: z.array(libraryItemSchema),
	/** How many titles match, on every page. */
	total: z.number(),
	page: z.number(),
	pageSize: z.number(),
});
export type LibraryPage = z.infer<typeof libraryPageSchema>;
