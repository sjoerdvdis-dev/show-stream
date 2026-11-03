import type { TranscodeStatus } from '@workspace/contract/api-types';
import type { ComponentProps, Key, ReactNode } from 'react';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { cn } from '@workspace/ui/lib/utils';
import { AppLink } from '@workspace/ui/patterns/link';
import { MediaImage } from '@workspace/ui/patterns/media-image';
import { EmptyState, ErrorState, LoadingGrid, posterGridClassName } from '@workspace/ui/patterns/states';
import { PlayButton, StatusBadge } from '@workspace/ui/patterns/status';

type MediaCardProps = {
	/** The title's page in the app, such as `/movies/7`. */
	href: string;
	title: string;
	/** A short line under the title, such as the year. */
	subtitle?: string;
	/** The poster. Missing art shows the fallback. */
	image: string | null | undefined;
	/** Shown on the poster when given. */
	status?: TranscodeStatus;
	/** Why the transcode failed, when `status` is `failed`. */
	failureReason?: string;
	/** With it, the card has its own Play button beside the link. */
	onPlay?: () => void;
	onRetry?: () => void;
	className?: string;
};

/**
 * A title in a grid or row: a poster and name that link to its page, with its status and an
 * optional Play button on the poster. The button sits beside the link, never inside it.
 */
export const MediaCard = ({
	href,
	title,
	subtitle,
	image,
	status,
	failureReason,
	onPlay,
	onRetry,
	className,
}: MediaCardProps) => (
	<div className={cn('group/card relative flex flex-col', className)}>
		<AppLink
			href={href}
			className="flex flex-col gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			<MediaImage
				src={image}
				alt=""
				aspect="poster"
				sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 50vw"
				className="rounded-lg ring-1 ring-border transition-shadow group-hover/card:ring-2 group-hover/card:ring-ring/60"
			/>
			<span className="flex min-w-0 flex-col px-0.5">
				<span className="line-clamp-2 text-sm font-medium">{title}</span>
				{subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}
			</span>
		</AppLink>
		{/* Covers the poster only, so that the badge and button sit on it whatever the title's length. */}
		{status || onPlay ? (
			<div className="pointer-events-none absolute inset-x-0 top-0 flex aspect-2/3 flex-col justify-between p-2">
				{status ? (
					<StatusBadge status={status} failureReason={failureReason} className="pointer-events-auto" />
				) : (
					<span />
				)}
				{onPlay ? (
					<PlayButton
						title={title}
						status={status}
						onPlay={onPlay}
						onRetry={onRetry}
						size="icon"
						className="pointer-events-auto self-end"
					/>
				) : null}
			</div>
		) : null}
	</div>
);

type CollectionProps<T> = {
	/** `undefined` until the data arrives. */
	items: readonly T[] | undefined;
	getKey: (item: T) => Key;
	/** Usually a `MediaCard`. */
	renderItem: (item: T) => ReactNode;
	loading?: boolean;
	/** Overrides `Loading <label>` for assistive technology. */
	loadingLabel?: string;
	/** Shown in place of the items when given. */
	error?: ComponentProps<typeof ErrorState>;
	empty?: ComponentProps<typeof EmptyState>;
	className?: string;
};

/** Which state a collection shows. An error wins over loading, and loading over empty. */
const collectionState = <T,>({ items, loading, error }: Pick<CollectionProps<T>, 'items' | 'loading' | 'error'>) =>
	error ? 'error' : loading || !items ? 'loading' : items.length === 0 ? 'empty' : 'items';

/** Titles in a responsive poster grid, with loading, empty and error states. */
export const MediaGrid = <T,>({
	label,
	items,
	getKey,
	renderItem,
	loading,
	loadingLabel = `Loading ${label.toLowerCase()}`,
	error,
	empty = { title: 'Nothing here yet' },
	className,
}: CollectionProps<T> & { label: string }) => {
	const state = collectionState({ items, loading, error });
	if (state === 'error' && error) return <ErrorState {...error} />;
	if (state === 'loading' || !items) return <LoadingGrid label={loadingLabel} className={className} />;
	if (state === 'empty') return <EmptyState {...empty} />;

	return (
		<ul aria-label={label} className={cn(posterGridClassName, className)}>
			{items.map((item) => (
				<li key={getKey(item)}>{renderItem(item)}</li>
			))}
		</ul>
	);
};

const rowItemClassName = 'w-36 shrink-0 snap-start sm:w-40 lg:w-44';

/**
 * A titled row of posters that scrolls sideways, for collections on Home. Tab moves through its
 * links, and the browser scrolls each one into view.
 */
export const MediaRow = <T,>({
	title,
	action,
	items,
	getKey,
	renderItem,
	loading,
	loadingLabel = `Loading ${title.toLowerCase()}`,
	error,
	empty = { title: 'Nothing here yet' },
	className,
}: CollectionProps<T> & { title: string; action?: ReactNode }) => {
	const state = collectionState({ items, loading, error });

	return (
		<section aria-label={title} className={cn('flex flex-col gap-3', className)}>
			<div className="flex items-baseline justify-between gap-4">
				<h2 className="text-lg font-semibold tracking-tight">{title}</h2>
				{action}
			</div>
			{state === 'error' && error ? (
				<ErrorState {...error} className="py-6" />
			) : state === 'loading' || !items ? (
				<div role="status" aria-label={loadingLabel} aria-busy="true" className="flex gap-3 overflow-hidden">
					{Array.from({ length: 8 }, (_, index) => (
						<div key={index} className={cn(rowItemClassName, 'flex flex-col gap-2')}>
							<Skeleton className="aspect-2/3 w-full rounded-lg" />
							<Skeleton className="h-4 w-3/4" />
						</div>
					))}
				</div>
			) : state === 'empty' ? (
				<EmptyState {...empty} className="py-6" />
			) : (
				<ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2">
					{items.map((item) => (
						<li key={getKey(item)} className={rowItemClassName}>
							{renderItem(item)}
						</li>
					))}
				</ul>
			)}
		</section>
	);
};
