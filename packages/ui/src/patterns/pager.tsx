import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';

type PagerProps = {
	/** From 1. */
	page: number;
	/** At least 1. */
	pageCount: number;
	onPageChange: (page: number) => void;
	/** Names the navigation landmark. */
	label?: string;
	className?: string;
};

/**
 * Previous and Next around the current page of a list, for a list that the server pages. It hides
 * itself when there is one page. The screen moves to the page, and puts it in the URL.
 */
export const Pager = ({ page, pageCount, onPageChange, label = 'Pages', className }: PagerProps) => {
	if (pageCount <= 1) return null;

	return (
		<nav aria-label={label} className={cn('flex items-center justify-center gap-3', className)}>
			<Button variant="outline" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
				<ChevronLeft aria-hidden="true" data-icon="inline-start" />
				Previous
			</Button>
			<p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
				Page {page} of {pageCount}
			</p>
			<Button
				variant="outline"
				aria-label="Next page"
				disabled={page >= pageCount}
				onClick={() => onPageChange(page + 1)}
			>
				Next
				<ChevronRight aria-hidden="true" data-icon="inline-end" />
			</Button>
		</nav>
	);
};
