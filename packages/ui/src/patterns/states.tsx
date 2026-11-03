import { CircleAlert, Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { cn } from '@workspace/ui/lib/utils';

/** The columns of a poster grid. `MediaGrid` and `LoadingGrid` share them, so loading keeps the layout. */
export const posterGridClassName =
	'grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';

type StateProps = {
	title: string;
	description?: ReactNode;
	icon?: LucideIcon;
	className?: string;
};

const StateLayout = ({
	title,
	description,
	icon: Icon,
	className,
	children,
	...props
}: StateProps & { children?: ReactNode; role?: string }) => (
	<div className={cn('flex flex-col items-center justify-center gap-3 px-4 py-12 text-center', className)} {...props}>
		{Icon ? <Icon aria-hidden="true" className="size-10 text-muted-foreground" /> : null}
		<div className="flex max-w-prose flex-col gap-1">
			<h2 className="text-lg font-semibold">{title}</h2>
			{description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
		</div>
		{children}
	</div>
);

/** A data view with nothing to show. `action` is what the user can do about it, such as a scan. */
export const EmptyState = ({ icon = Inbox, action, ...props }: StateProps & { action?: ReactNode }) => (
	<StateLayout icon={icon} {...props}>
		{action}
	</StateLayout>
);

/** A data view that failed to load. With `onRetry` it offers Try again. */
export const ErrorState = ({
	icon = CircleAlert,
	onRetry,
	retryLabel = 'Try again',
	...props
}: StateProps & { onRetry?: () => void; retryLabel?: string }) => (
	<StateLayout role="alert" icon={icon} {...props}>
		{onRetry ? (
			<Button variant="outline" onClick={onRetry}>
				{retryLabel}
			</Button>
		) : null}
	</StateLayout>
);

/** Poster-shaped placeholders in the grid's own columns, so that the page does not jump when data arrives. */
export const LoadingGrid = ({
	label = 'Loading',
	count = 12,
	className,
}: {
	label?: string;
	count?: number;
	className?: string;
}) => (
	<div role="status" aria-label={label} aria-busy="true" className={cn(posterGridClassName, className)}>
		{Array.from({ length: count }, (_, index) => (
			<div key={index} className="flex flex-col gap-2">
				<Skeleton className="aspect-2/3 w-full rounded-lg" />
				<Skeleton className="h-4 w-3/4" />
				<Skeleton className="h-3 w-1/3" />
			</div>
		))}
	</div>
);
