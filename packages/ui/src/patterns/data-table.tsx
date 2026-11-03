import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Skeleton } from '@workspace/ui/components/skeleton';
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@workspace/ui/components/table';
import { cn } from '@workspace/ui/lib/utils';
import { EmptyState, ErrorState } from '@workspace/ui/patterns/states';

/** One column of a `DataTable`: its header, and how to draw its cell for a row. */
export type DataTableColumn<Row> = {
	id: string;
	header: string;
	cell: (row: Row) => ReactNode;
	sortable?: boolean;
};

/** The column a `DataTable` is sorted by, in the words `aria-sort` uses. */
export type DataTableSort = { column: string; direction: 'ascending' | 'descending' };

export type DataTableProps<Row> = {
	caption: string;
	columns: DataTableColumn<Row>[];
	rows: Row[];
	getRowId: (row: Row) => string;
	/** The current sort. The screen sorts the rows; the table only shows the sort and asks to change it. */
	sort?: DataTableSort;
	onSortChange?: (sort: DataTableSort) => void;
	/** Shows placeholder rows under the headers, so that the table does not jump when the rows arrive. */
	loading?: boolean;
	loadingLabel?: string;
	/** What to say when there are no rows. */
	empty?: ComponentProps<typeof EmptyState>;
	/** Shows this error in place of the rows. With `onRetry` it offers Try again. */
	error?: ComponentProps<typeof ErrorState>;
	className?: string;
};

const loadingRowCount = 5;

const nextSort = (column: string, sort: DataTableSort | undefined): DataTableSort => ({
	column,
	direction: sort?.column === column && sort.direction === 'ascending' ? 'descending' : 'ascending',
});

const SortIcon = ({ direction }: { direction: DataTableSort['direction'] | undefined }) => {
	const Icon = direction === 'ascending' ? ArrowUp : direction === 'descending' ? ArrowDown : ArrowUpDown;
	return <Icon aria-hidden="true" className={cn(!direction && 'text-muted-foreground')} />;
};

/** One cell across every column, for a state in place of the rows. */
const FullWidthRow = ({ columnCount, children }: { columnCount: number; children: ReactNode }) => (
	<TableRow className="hover:bg-transparent">
		<TableCell colSpan={columnCount} className="whitespace-normal">
			{children}
		</TableCell>
	</TableRow>
);

/** A table of rows for admin screens, such as users or libraries, with sorting through props. */
export const DataTable = <Row,>({
	caption,
	columns,
	rows,
	getRowId,
	sort,
	onSortChange,
	loading = false,
	loadingLabel = 'Loading',
	empty = { title: 'Nothing here yet' },
	error,
	className,
}: DataTableProps<Row>) => {
	const body = (): ReactNode => {
		if (loading) {
			return Array.from({ length: loadingRowCount }, (_, index) => (
				<TableRow key={index} aria-hidden="true">
					{columns.map((column) => (
						<TableCell key={column.id}>
							<Skeleton className="h-4 w-24" />
						</TableCell>
					))}
				</TableRow>
			));
		}
		if (error) {
			return (
				<FullWidthRow columnCount={columns.length}>
					<ErrorState {...error} />
				</FullWidthRow>
			);
		}
		if (rows.length === 0) {
			return (
				<FullWidthRow columnCount={columns.length}>
					<EmptyState {...empty} />
				</FullWidthRow>
			);
		}
		return rows.map((row) => (
			<TableRow key={getRowId(row)}>
				{columns.map((column) => (
					<TableCell key={column.id}>{column.cell(row)}</TableCell>
				))}
			</TableRow>
		));
	};

	return (
		<div className={cn('flex flex-col', className)}>
			<p role="status" className="sr-only">
				{loading ? loadingLabel : null}
			</p>
			<Table aria-busy={loading || undefined}>
				<TableCaption>{caption}</TableCaption>
				<TableHeader>
					<TableRow>
						{columns.map((column) => {
							const direction = sort?.column === column.id ? sort.direction : undefined;
							return (
								<TableHead key={column.id} scope="col" aria-sort={direction}>
									{column.sortable ? (
										<Button
											variant="ghost"
											size="sm"
											className="-ml-2.5"
											onClick={() => onSortChange?.(nextSort(column.id, sort))}
										>
											{column.header}
											<SortIcon direction={direction} />
										</Button>
									) : (
										column.header
									)}
								</TableHead>
							);
						})}
					</TableRow>
				</TableHeader>
				<TableBody>{body()}</TableBody>
			</Table>
		</div>
	);
};
