import { useId, useState, type ReactNode } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Checkbox } from '@workspace/ui/components/checkbox';
import { DualRangeSlider } from '@workspace/ui/components/dual-range-slider';
import { FieldError, FieldLabel, FieldLegend, FieldSet } from '@workspace/ui/components/field';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { cn } from '@workspace/ui/lib/utils';
import { LoadingStatus } from '@workspace/ui/patterns/states';

type RangeFilterProps = {
	label: string;
	min: number;
	max: number;
	step?: number;
	value: [number, number];
	onChange: (value: [number, number]) => void;
	formatValue?: (value: number) => string;
	className?: string;
};

/** A filter on a span of numbers, such as runtime or rating, with a handle at each end. */
export const RangeFilter = ({
	label,
	min,
	max,
	step = 1,
	value,
	onChange,
	formatValue = String,
	className,
}: RangeFilterProps) => {
	const labelId = useId();
	return (
		<div className={cn('flex flex-col gap-3', className)}>
			<div className="flex items-baseline justify-between gap-2 text-sm">
				<span id={labelId} className="font-medium">
					{label}
				</span>
				<span className="text-muted-foreground tabular-nums">
					{formatValue(value[0])} – {formatValue(value[1])}
				</span>
			</div>
			<DualRangeSlider
				aria-labelledby={labelId}
				min={min}
				max={max}
				step={step}
				value={value}
				onValueChange={(next) => {
					if (Array.isArray(next)) onChange([next[0] ?? min, next[1] ?? max]);
				}}
			/>
		</div>
	);
};

/** A calendar day as an ISO date, `YYYY-MM-DD`. The type keeps out other text; the filter checks the digits. */
export type IsoDate = `${number}-${number}-${number}`;

/** A span of calendar days. A missing end is open. */
export type DateRange = { from?: IsoDate; to?: IsoDate };

type DateRangeFilterProps = {
	label: string;
	value: DateRange;
	onChange: (value: DateRange) => void;
	className?: string;
};

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const isIsoDate = (input: string): input is IsoDate => isoDatePattern.test(input);
const toRange = (from: IsoDate | '', to: IsoDate | ''): DateRange => ({
	...(from ? { from } : {}),
	...(to ? { to } : {}),
});

/**
 * A filter on a span of days, from two native date inputs. It emits only ISO dates, and holds back a
 * range whose end is before its start, so no locale format is ever parsed.
 */
export const DateRangeFilter = ({ label, value, onChange, className }: DateRangeFilterProps) => {
	const id = useId();
	const [draft, setDraft] = useState<Record<'from' | 'to', IsoDate | ''>>({
		from: value.from ?? '',
		to: value.to ?? '',
	});
	// The range last agreed with the screen, whether it came in as `value` or went out through `onChange`.
	const [syncedRange, setSyncedRange] = useState(value);
	// A new value from the screen replaces whatever the user left half-typed.
	if (syncedRange.from !== value.from || syncedRange.to !== value.to) {
		setSyncedRange(value);
		setDraft({ from: value.from ?? '', to: value.to ?? '' });
	}
	const reversed = Boolean(draft.from && draft.to && draft.from > draft.to);
	const errorId = `${id}-error`;

	const change = (end: 'from' | 'to', input: string) => {
		const next = { ...draft, [end]: isIsoDate(input) ? input : '' };
		setDraft(next);
		if (next.from && next.to && next.from > next.to) return;
		const range = toRange(next.from, next.to);
		setSyncedRange(range);
		onChange(range);
	};

	return (
		<FieldSet className={cn('gap-3', className)}>
			<FieldLegend variant="label" className="mb-0">
				{label}
			</FieldLegend>
			<div className="grid grid-cols-2 gap-2">
				{(['from', 'to'] as const).map((end) => (
					<div key={end} className="flex min-w-0 flex-col gap-1.5">
						<FieldLabel htmlFor={`${id}-${end}`} className="text-xs text-muted-foreground">
							{end === 'from' ? 'From' : 'To'}
						</FieldLabel>
						<Input
							id={`${id}-${end}`}
							type="date"
							value={draft[end]}
							min={end === 'to' ? draft.from || undefined : undefined}
							max={end === 'from' ? draft.to || undefined : undefined}
							aria-invalid={reversed || undefined}
							aria-describedby={reversed ? errorId : undefined}
							onChange={(event) => change(end, event.target.value)}
						/>
					</div>
				))}
			</div>
			{reversed ? <FieldError id={errorId}>The end date is before the start date.</FieldError> : null}
		</FieldSet>
	);
};

/** One choice in a `FacetFilter`. `count` is how many items have it, when the server says. */
export type FacetOption = { value: string; label: string; count?: number };

type FacetFilterProps = {
	label: string;
	options: FacetOption[];
	selected: string[];
	onChange: (selected: string[]) => void;
	/** The options are still loading. */
	loading?: boolean;
	/** Why the options failed to load. It wins over `loading`. */
	error?: ReactNode;
	onRetry?: () => void;
	emptyText?: ReactNode;
	className?: string;
};

const FacetBody = ({
	label,
	options,
	selected,
	onChange,
	loading,
	error,
	onRetry,
	emptyText = 'No options yet.',
}: Omit<FacetFilterProps, 'className'>) => {
	if (error) {
		return (
			<div role="alert" className="flex flex-col items-start gap-2 text-sm text-destructive">
				<p>{error}</p>
				{onRetry ? (
					<Button variant="outline" size="sm" onClick={onRetry}>
						Try again
					</Button>
				) : null}
			</div>
		);
	}
	if (loading) {
		return (
			<LoadingStatus label={`Loading ${label}`} className="flex flex-col gap-2.5 py-1">
				{Array.from({ length: 4 }, (_, index) => (
					<Skeleton key={index} className="h-4 w-2/3" />
				))}
			</LoadingStatus>
		);
	}
	if (options.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;

	const toggle = (value: string, checked: boolean) =>
		onChange(checked ? [...selected, value] : selected.filter((item) => item !== value));
	return (
		<div className="flex flex-col gap-0.5">
			{options.map((option) => (
				<Label key={option.value} className="rounded-md px-1 py-1.5 font-normal hover:bg-muted">
					<Checkbox
						checked={selected.includes(option.value)}
						onCheckedChange={(checked) => toggle(option.value, checked)}
					/>
					<span className="min-w-0 flex-1 truncate">{option.label}</span>
					{option.count === undefined ? null : (
						<span className="text-xs text-muted-foreground tabular-nums">{option.count}</span>
					)}
				</Label>
			))}
		</div>
	);
};

/**
 * A filter on a set of values, such as genres, with a checkbox for each. Its options are data from the
 * server, so it shows their loading, empty and error states.
 */
export const FacetFilter = ({ className, ...props }: FacetFilterProps) => (
	<FieldSet className={cn('gap-2', className)}>
		<FieldLegend variant="label" className="mb-1">
			{props.label}
		</FieldLegend>
		<FacetBody {...props} />
	</FieldSet>
);
