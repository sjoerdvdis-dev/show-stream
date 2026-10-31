'use client';

import { useEffect, useState } from 'react';
import { cn } from '@workspace/ui/lib/utils';
import { CalendarIcon, Check, ChevronsUpDown, FilterIcon, SortAscIcon, SortDescIcon, XIcon } from 'lucide-react';
import { getTranscodeStatusIcon } from './transcode-status-icon';
import {
	FilterInput,
	FilterSelectionState,
	SearchState,
	SliderRange,
	SortOrder,
	SortState,
} from '@/hooks/use-media-browser';
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@workspace/ui/components/drawer';
import { Input } from '@workspace/ui/components/input';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@workspace/ui/components/command';
import { Button } from '@workspace/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover';
import { DualRangeSlider } from '@workspace/ui/components/dual-range-slider';
import { Calendar } from '@workspace/ui/components/calendar';
import { RadioGroup, RadioGroupItem } from '@workspace/ui/components/radio-group';
import { Label } from '@workspace/ui/components/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from '@workspace/ui/components/select';
import { useDebouncedCallback } from 'use-debounce';
import type { TranscodeStatus } from '@workspace/types/db-types';

export function Search({ searchQuery, setSearchQuery, media }: SearchState & { media?: string }) {
	return (
		<Input
			type="search"
			spellCheck="false"
			value={searchQuery}
			placeholder={`Search ${media} ...`}
			onChange={(e) => setSearchQuery(e.target.value)}
		/>
	);
}

export function Sort({ sortOption, sortOptions, setSortOption }: SortState) {
	return (
		<Select
			value={sortOption?.label}
			onValueChange={(value) => setSortOption(sortOptions.find((o) => o.label === value) || sortOptions[0])}
		>
			<SelectTrigger className="flex items-center min-w-[250px]">
				<div className="border-r size-fit pr-1">
					{sortOption?.sortOrder == SortOrder.Asc ? <SortAscIcon /> : <SortDescIcon />}
				</div>
				<span className="min-w-fit capitalize text-end mr-auto">{sortOption?.label}</span>
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{sortOptions.map((option) => (
						<SelectItem key={option.label} value={option.label} className="capitalize">
							{option.label}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

export function Filter({
	input,
	selection,
	activeFiltersCount = 0,
	applyFilter,
}: {
	input: FilterInput;
	selection: FilterSelectionState;
	activeFiltersCount?: number;
	applyFilter: () => void;
}) {
	const [preventDismiss, setPreventDismiss] = useState(false);

	return (
		<Drawer direction="right" onClose={applyFilter} dismissible={!preventDismiss}>
			<Button asChild>
				<DrawerTrigger className="flex gap-1 items-center ml-auto">
					<FilterIcon size={16} />
					<span>Filter</span>
				</DrawerTrigger>
			</Button>
			<DrawerContent fullBorder>
				<DrawerHeader className="border-r border-b p-6">
					<div className="flex">
						<div>
							<DrawerTitle className="text-2xl">Filters</DrawerTitle>
							<DrawerDescription className="text-md">{activeFiltersCount} Active Filters</DrawerDescription>
						</div>
						<DrawerClose asChild>
							<Button size="sm" className="mt-1.5 ml-auto">
								<XIcon />
							</Button>
						</DrawerClose>
					</div>
				</DrawerHeader>
				<FilterContainer>
					<FilterSection
						title="Genres"
						clear={selection.clearGenres}
						filter={
							<FilterDropdown
								options={input.genres}
								selection={selection.genres}
								setSelection={selection.setGenre}
								placeholder="available genres"
							/>
						}
					/>
					<FilterSection
						title="Studios"
						clear={selection.clearStudios}
						filter={
							<FilterDropdown
								options={input.studios}
								selection={selection.studios}
								setSelection={selection.setStudio}
								placeholder="available studios"
							/>
						}
					/>
					<FilterSection
						title="Release Date"
						clear={selection.clearReleaseDates}
						filter={
							<div className="flex gap-4">
								<FilterDatePicker
									header="Start"
									selection={selection.releaseDates.start}
									setSelection={(date) => selection.setReleaseDate({ start: date })}
								/>
								<FilterDatePicker
									header="End"
									selection={selection.releaseDates.end}
									setSelection={(date) => selection.setReleaseDate({ end: date })}
								/>
							</div>
						}
					/>
					<FilterSection
						title="Runtime"
						clear={selection.clearRuntimes}
						filter={
							<FilterSlider
								range={input.runtimes}
								value={selection.runtimes}
								setValue={selection.setRuntimes}
								step={10}
								onPointerEnter={() => setPreventDismiss(true)}
								onPointerLeave={() => setPreventDismiss(false)}
							/>
						}
					/>
					<FilterSection
						title="User Score"
						clear={selection.clearScores}
						filter={
							<FilterSlider
								range={[1, 10]}
								value={selection.scores}
								setValue={selection.setScores}
								step={1}
								onPointerEnter={() => setPreventDismiss(true)}
								onPointerLeave={() => setPreventDismiss(false)}
							/>
						}
					/>
					<FilterSection
						title="User Votes"
						clear={selection.clearVotes}
						filter={
							<FilterSlider
								range={input.votes}
								value={selection.votes}
								setValue={selection.setVotes}
								step={100}
								onPointerEnter={() => setPreventDismiss(true)}
								onPointerLeave={() => setPreventDismiss(false)}
							/>
						}
					/>
					<FilterSection
						title="Playback Status"
						clear={selection.clearTranscodeStatus}
						filter={
							// TODO: Types here can be improved
							<FilterRadioGroup
								options={input.transcodeStatuses}
								selection={selection.transcodeStatus}
								icons={(option) => getTranscodeStatusIcon(option as TranscodeStatus | 'all', '16')}
								setSelection={selection.setTranscodeStatus as (value: string) => void}
							/>
						}
					/>
					<Button className="mt-auto" onClick={() => selection.clearSelections()}>
						Clear All
					</Button>
				</FilterContainer>
			</DrawerContent>
		</Drawer>
	);
}

export function FilterContainer({ children }: { children?: React.ReactNode }) {
	return <div className="h-full border-r px-6 py-5 gap-5 flex flex-col w-full">{children}</div>;
}

export function FilterSection({ title, filter, clear }: { title: string; filter: React.ReactNode; clear: () => void }) {
	return (
		<div className="flex flex-col w-full gap-3 relative">
			<p className="text-xl flex gap-[6px]">
				{title}
				{
					<Button variant="ghost" size="icon" className="p-[2px] size-fit mt-1.5" onClick={() => clear()}>
						<XIcon />
					</Button>
				}
			</p>
			{filter}
		</div>
	);
}

export function FilterDropdown({
	options,
	selection,
	setSelection,
	placeholder,
}: {
	options: string[];
	selection: string[];
	setSelection: (value: string) => void;
	placeholder?: string;
}) {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
					<span className="max-w-full truncate">{selection.sort().join(', ') || `Select ${placeholder}...`}</span>
					<ChevronsUpDown className="opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent fullWidth>
				<Command>
					<CommandInput placeholder={`Search ${placeholder}...`} className="h-9" />
					<CommandList>
						<CommandEmpty>{`No ${placeholder} found.`}</CommandEmpty>
						<CommandGroup>
							{options?.map((genre) => (
								<CommandItem key={genre} value={genre} onSelect={(value) => setSelection(value)}>
									{genre}
									<Check className={cn('ml-auto', selection.includes(genre) ? 'opacity-100' : 'opacity-0')} />
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export function FilterSlider({
	range: [min, max],
	value,
	setValue,
	label = '',
	step = 1,
	onPointerEnter,
	onPointerLeave,
}: {
	range: [number, number];
	value: SliderRange;
	setValue: (value: SliderRange) => void;
	label?: string;
	step?: number;
	onPointerEnter?: () => void;
	onPointerLeave?: () => void;
}) {
	const [localValue, setLocalValue] = useState(value);

	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	const debouncedSetValue = useDebouncedCallback((newValue: SliderRange) => {
		setValue(newValue);
	}, 200);

	const handleValueChange = (newValue: [number, number]) => {
		setLocalValue(newValue);
		debouncedSetValue(newValue);
	};

	return (
		<div className="w-full px-2 pb-[14px]">
			<DualRangeSlider
				label={(value) => (
					<span>
						{value}
						{label}
					</span>
				)}
				value={localValue || [min, max]}
				onValueChange={handleValueChange}
				min={min}
				max={max}
				step={step}
				labelPosition="bottom"
				onPointerEnter={onPointerEnter}
				onPointerLeave={onPointerLeave}
			/>
		</div>
	);
}

function formatDate(date: Date | undefined) {
	if (!date) {
		return '';
	}
	return date.toLocaleDateString('en-GB', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});
}
function isValidDate(date: Date | undefined) {
	if (!date) {
		return false;
	}
	return !isNaN(date.getTime());
}
export function FilterDatePicker({
	selection,
	setSelection,
	header,
}: {
	header: string;
	selection: Date | undefined;
	setSelection: (date: Date | undefined) => void;
}) {
	const [open, setOpen] = useState(false);
	const [month, setMonth] = useState<Date | undefined>(selection);
	const [value, setValue] = useState(formatDate(selection));

	useEffect(() => {
		setValue(formatDate(selection));
		setMonth(selection);
	}, [selection]);

	return (
		<div className="flex flex-col w-full gap-1">
			<p>{header}</p>
			<div className="relative flex gap-2">
				<Input
					id="date"
					value={value}
					placeholder="DD/MM/YYYY"
					className="bg-background pr-10"
					autoComplete="off"
					onChange={(e) => {
						const date = new Date(e.target.value);
						setValue(e.target.value);
						if (isValidDate(date)) {
							setSelection(date);
						} else {
							setSelection(undefined);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === 'ArrowDown') {
							e.preventDefault();
							setOpen(true);
						}
					}}
				/>
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button id="date-picker" variant="ghost" className="absolute top-1/2 right-2 size-6 -translate-y-1/2">
							<CalendarIcon className="size-3.5" />
							<span className="sr-only">Select date</span>
						</Button>
					</PopoverTrigger>
					<PopoverContent className="overflow-hidden p-0" align="end" alignOffset={-8} sideOffset={10} fullWidth>
						<Calendar
							mode="single"
							selected={selection}
							captionLayout="dropdown"
							className="w-full"
							month={month}
							onMonthChange={setMonth}
							onSelect={(date) => {
								setSelection(date);
								setValue(formatDate(date));
								setOpen(false);
							}}
						/>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}

export function FilterRadioGroup({
	options,
	icons,
	selection,
	setSelection,
}: {
	options: string[];
	icons: (option: string) => React.ReactNode;
	selection: string;
	setSelection: (value: string) => void;
}) {
	return (
		<RadioGroup value={selection} onValueChange={setSelection}>
			{options.map((option) => (
				<div key={option} className="flex items-center gap-3">
					<RadioGroupItem value={option} id={`r-${option}`} />
					<Label className="flex gap-2 capitalize" htmlFor={`r-${option}`}>
						{icons(option)}
						{option}
					</Label>
				</div>
			))}
		</RadioGroup>
	);
}
