import { useRouteContext } from '@tanstack/react-router';
import type { TranscodeStatus } from '@workspace/contract/api-types';
import type { LibraryItem } from '@workspace/contract/library';
import { Button, buttonVariants } from '@workspace/ui/components/button';
import { FilterBar } from '@workspace/ui/patterns/filter-bar';
import { DateRangeFilter, FacetFilter, RangeFilter, type IsoDate } from '@workspace/ui/patterns/filters';
import { AppLink } from '@workspace/ui/patterns/link';
import { MediaCard, MediaGrid } from '@workspace/ui/patterns/media-card';
import { PageContainer, PageHeader } from '@workspace/ui/patterns/page';
import { Pager } from '@workspace/ui/patterns/pager';
import type { ComponentProps } from 'react';
import {
	fromSortChoice,
	rangeFilters,
	sortChoices,
	toSortChoice,
	type LibrarySearch,
	type RangeFilterSpec,
} from '@/features/library/library-search';
import { useLibraryList, type LibrarySource, type SearchUpdater } from '@/features/library/use-library-list';
import { usePlay } from '@/features/library/use-play';

const statusOptions: { value: TranscodeStatus; label: string }[] = [
	{ value: 'ready', label: 'Ready' },
	{ value: 'in progress', label: 'Preparing' },
	{ value: 'not ready', label: 'Not ready' },
	{ value: 'failed', label: 'Failed' },
];

/** A slider's value, kept inside the library's range, and left out of the URL at either edge. */
const toRange = (bounds: { min: number; max: number }, low: number | undefined, high: number | undefined) =>
	[Math.max(bounds.min, low ?? bounds.min), Math.min(bounds.max, high ?? bounds.max)] as [number, number];

const fromRange = (bounds: { min: number; max: number }, [low, high]: [number, number], decimals = 0) => {
	const round = (value: number) => Number(value.toFixed(decimals));
	return [low <= bounds.min ? undefined : round(low), high >= bounds.max ? undefined : round(high)] as const;
};

type List = ReturnType<typeof useLibraryList>;

/** A numeric range's slider, over the library's facet. A range no title has a value for is left out. */
const LibraryRange = ({ list, range }: { list: List; range: RangeFilterSpec }) => {
	const bounds = list.facets.data?.[range.facet];
	if (!bounds) return null;
	return (
		<RangeFilter
			label={range.label}
			min={bounds.min}
			max={bounds.max}
			step={range.step}
			value={toRange(bounds, list.search[range.min], list.search[range.max])}
			formatValue={range.format}
			onChange={(value) => {
				const [low, high] = fromRange(bounds, value, range.decimals);
				list.setFiltersSoon({ [range.min]: low, [range.max]: high });
			}}
		/>
	);
};

/** The filters a library's facets allow. A range no title has a value for is left out. */
const LibraryFilters = ({ list }: { list: List }) => {
	const { facets, search, setFilters } = list;
	const facetError = facets.isError ? 'Could not load the filters.' : undefined;
	const releaseDate = facets.data?.releaseDate;

	return (
		<>
			<FacetFilter
				label="Status"
				options={statusOptions.map((option) => ({ ...option, count: facets.data?.statuses[option.value] }))}
				selected={search.status ?? []}
				onChange={(selected) =>
					setFilters({ status: selected.length > 0 ? (selected as TranscodeStatus[]) : undefined })
				}
				loading={facets.isPending}
				error={facetError}
				onRetry={() => void facets.refetch()}
			/>
			<FacetFilter
				label="Genre"
				options={(facets.data?.genres ?? []).map(({ name, count }) => ({ value: name, label: name, count }))}
				selected={search.genre ?? []}
				onChange={(selected) => setFilters({ genre: selected.length > 0 ? selected : undefined })}
				loading={facets.isPending}
				error={facetError}
				onRetry={() => void facets.refetch()}
				emptyText="No genres yet."
			/>
			<LibraryRange list={list} range={rangeFilters.year} />
			{releaseDate ? (
				<DateRangeFilter
					label="Release date"
					value={{
						from: search.releaseDateFrom as IsoDate | undefined,
						to: search.releaseDateTo as IsoDate | undefined,
					}}
					onChange={({ from, to }) => setFilters({ releaseDateFrom: from, releaseDateTo: to })}
				/>
			) : null}
			<LibraryRange list={list} range={rangeFilters.runtime} />
			<LibraryRange list={list} range={rangeFilters.rating} />
		</>
	);
};

/** What an empty grid says: no titles at all, none that match, or a page past the end. */
const useEmptyState = (list: List, noun: string): ComponentProps<typeof MediaGrid>['empty'] => {
	const { user } = useRouteContext({ from: '/_app' });
	const total = list.list.data?.total ?? 0;

	if (total > 0) {
		return {
			title: `There is no page ${list.page}`,
			action: <Button onClick={() => list.setPage(1)}>Go to the first page</Button>,
		};
	}
	if (list.isNarrowed) {
		return {
			title: `No ${noun} match`,
			description: 'Try another search, or fewer filters.',
			action:
				list.activeFilterCount > 0 ? (
					<Button variant="outline" onClick={list.clearFilters}>
						Clear filters
					</Button>
				) : null,
		};
	}
	if (user.role === 'owner' || user.role === 'admin') {
		return {
			title: `No ${noun} yet`,
			description: `Scan the library in Settings to add the ${noun} in your media folder.`,
			action: (
				<AppLink href="/settings" className={buttonVariants()}>
					Go to Settings
				</AppLink>
			),
		};
	}
	return { title: `No ${noun} yet`, description: `An admin can scan the library to add ${noun}.` };
};

type LibraryScreenProps = {
	/** The page's title, such as Movies. */
	title: string;
	source: LibrarySource;
	search: LibrarySearch;
	onSearchChange: SearchUpdater;
};

/**
 * A library: search, sort and filters above a paged poster grid, all held in the URL. Shows reuse
 * it in Phase 6 with a source of their own.
 */
export const LibraryScreen = ({ title, source, search, onSearchChange }: LibraryScreenProps) => {
	const list = useLibraryList({ source, search, onSearchChange });
	const play = usePlay();
	const noun = title.toLowerCase();
	const empty = useEmptyState(list, noun);
	const { data, isPending, isError, error, refetch } = list.list;

	return (
		<PageContainer>
			<PageHeader
				title={title}
				description={
					data && data.total > 0 ? `${data.total} ${data.total === 1 ? noun.replace(/s$/, '') : noun}` : null
				}
			/>
			<FilterBar
				search={list.searchText}
				onSearchChange={list.setSearchText}
				searchLabel={`Search ${noun}`}
				sort={toSortChoice(list.search)}
				sortOptions={sortChoices}
				onSortChange={(choice) => list.setSort(fromSortChoice(choice))}
				filters={<LibraryFilters list={list} />}
				activeFilterCount={list.activeFilterCount}
				onClearFilters={list.activeFilterCount > 0 ? list.clearFilters : undefined}
			/>
			<MediaGrid<LibraryItem>
				label={title}
				items={data?.items}
				getKey={(item) => item.id}
				loading={isPending}
				error={
					isError
						? { title: `Could not load the ${noun}`, description: error.message, onRetry: () => void refetch() }
						: undefined
				}
				empty={empty}
				renderItem={(item) => (
					<MediaCard
						href={source.href(item.id)}
						title={item.title}
						subtitle={item.year === null ? undefined : String(item.year)}
						image={item.hasPoster ? source.imageUrl(item.id, 'poster') : null}
						status={item.status}
						onPlay={() => play({ id: item.id, title: item.title })}
					/>
				)}
			/>
			{isError ? null : (
				<Pager page={list.page} pageCount={list.pageCount} onPageChange={list.setPage} label={`${title} pages`} />
			)}
		</PageContainer>
	);
};
