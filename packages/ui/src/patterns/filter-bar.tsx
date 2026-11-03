import { FilterXIcon, SearchIcon, SlidersHorizontalIcon, XIcon } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@workspace/ui/components/input-group';
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@workspace/ui/components/popover';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@workspace/ui/components/select';
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@workspace/ui/components/sheet';
import { useIsMobile } from '@workspace/ui/hooks/use-mobile';
import { cn } from '@workspace/ui/lib/utils';

type SearchInputProps = {
	value: string;
	onChange: (value: string) => void;
	label?: string;
	placeholder?: string;
	className?: string;
};

/** A search box with a clear button. Its label is for assistive technology, as the icon says it to the eye. */
export const SearchInput = ({ value, onChange, label = 'Search', placeholder, className }: SearchInputProps) => {
	const inputRef = useRef<HTMLInputElement>(null);
	return (
		<InputGroup className={cn('min-w-0', className)}>
			<InputGroupAddon>
				<SearchIcon aria-hidden="true" />
			</InputGroupAddon>
			<InputGroupInput
				ref={inputRef}
				type="search"
				aria-label={label}
				placeholder={placeholder ?? `${label}…`}
				value={value}
				onChange={(event) => onChange(event.target.value)}
			/>
			{value ? (
				<InputGroupAddon align="inline-end">
					<InputGroupButton
						size="icon-xs"
						aria-label="Clear search"
						onClick={() => {
							onChange('');
							inputRef.current?.focus();
						}}
					>
						<XIcon aria-hidden="true" />
					</InputGroupButton>
				</InputGroupAddon>
			) : null}
		</InputGroup>
	);
};

/** One way to order a list. `value` is what the screen sends the server. */
export type SortOption<T extends string = string> = { value: T; label: string };

type SortSelectProps<T extends string> = {
	options: SortOption<T>[];
	value: T;
	onChange: (value: T) => void;
	label?: string;
	className?: string;
};

/** A choice of order for a list, showing the label of the current one. */
export const SortSelect = <T extends string>({
	options,
	value,
	onChange,
	label = 'Sort by',
	className,
}: SortSelectProps<T>) => (
	<Select items={options} value={value} onValueChange={(next) => next !== null && onChange(next)}>
		<SelectTrigger aria-label={label} className={className}>
			<SelectValue />
		</SelectTrigger>
		<SelectContent>
			<SelectGroup>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectGroup>
		</SelectContent>
	</Select>
);

type FilterPanelProps = {
	children: ReactNode;
	onClear?: () => void;
	clearLabel?: string;
	className?: string;
};

/** The filters of a list, stacked, with Clear filters when the screen can reset them. */
export const FilterPanel = ({ children, onClear, clearLabel = 'Clear filters', className }: FilterPanelProps) => (
	<div className={cn('flex flex-col gap-6', className)}>
		{children}
		{onClear ? (
			<Button variant="outline" size="sm" className="self-start" onClick={onClear}>
				<FilterXIcon aria-hidden="true" />
				{clearLabel}
			</Button>
		) : null}
	</div>
);

const filtersName = (count: number) => (count > 0 ? `Filters, ${count} active` : 'Filters');

const FiltersButtonContent = ({ count }: { count: number }) => (
	<>
		<SlidersHorizontalIcon aria-hidden="true" />
		Filters
		{count > 0 ? (
			<Badge aria-hidden="true" className="tabular-nums">
				{count}
			</Badge>
		) : null}
	</>
);

type FilterBarProps<T extends string> = {
	search: string;
	onSearchChange: (search: string) => void;
	searchLabel?: string;
	searchPlaceholder?: string;
	/** The sort. Without `sortOptions` there is no sort control. */
	sort?: T;
	sortOptions?: SortOption<T>[];
	onSortChange?: (sort: T) => void;
	sortLabel?: string;
	/** The filter controls, such as `FacetFilter`s. Each emits its own changes. */
	filters?: ReactNode;
	/** How many filters are set, shown on the Filters button. */
	activeFilterCount?: number;
	onClearFilters?: () => void;
	className?: string;
};

/**
 * The controls above a list: search, sort and filters. The filters open in a popover, and on a phone in
 * a sheet from the bottom, behind a Filters button that counts the active ones.
 */
export const FilterBar = <T extends string>({
	search,
	onSearchChange,
	searchLabel,
	searchPlaceholder,
	sort,
	sortOptions,
	onSortChange,
	sortLabel,
	filters,
	activeFilterCount = 0,
	onClearFilters,
	className,
}: FilterBarProps<T>) => {
	const isMobile = useIsMobile();
	const panel = filters ? <FilterPanel onClear={onClearFilters}>{filters}</FilterPanel> : null;
	const trigger = <Button variant="outline" aria-label={filtersName(activeFilterCount)} />;

	return (
		<div role="search" className={cn('flex flex-wrap items-center gap-2', className)}>
			<SearchInput
				value={search}
				onChange={onSearchChange}
				label={searchLabel}
				placeholder={searchPlaceholder}
				className="basis-full sm:max-w-sm sm:flex-1 sm:basis-auto"
			/>
			{sortOptions && sort !== undefined && onSortChange ? (
				<SortSelect options={sortOptions} value={sort} onChange={onSortChange} label={sortLabel} />
			) : null}
			{panel && isMobile ? (
				<Sheet>
					<SheetTrigger render={trigger}>
						<FiltersButtonContent count={activeFilterCount} />
					</SheetTrigger>
					<SheetContent side="bottom" className="max-h-[85svh]">
						<SheetHeader>
							<SheetTitle>Filters</SheetTitle>
						</SheetHeader>
						<div className="min-h-0 flex-1 overflow-y-auto px-4">{panel}</div>
						<SheetFooter>
							<SheetClose render={<Button />}>Done</SheetClose>
						</SheetFooter>
					</SheetContent>
				</Sheet>
			) : null}
			{panel && !isMobile ? (
				<Popover>
					<PopoverTrigger render={trigger}>
						<FiltersButtonContent count={activeFilterCount} />
					</PopoverTrigger>
					<PopoverContent align="end" className="max-h-(--available-height) w-80 gap-4 overflow-y-auto p-4">
						<PopoverHeader>
							<PopoverTitle>Filters</PopoverTitle>
						</PopoverHeader>
						{panel}
					</PopoverContent>
				</Popover>
			) : null}
		</div>
	);
};
