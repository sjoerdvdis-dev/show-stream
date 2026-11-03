import type { TranscodeStatus } from '@workspace/contract/api-types';
import type { ComponentProps, ReactNode } from 'react';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { cn } from '@workspace/ui/lib/utils';
import { MediaImage } from '@workspace/ui/patterns/media-image';
import { ErrorState } from '@workspace/ui/patterns/states';
import { StatusBadge } from '@workspace/ui/patterns/status';

type MediaHeroData = {
	title: string;
	tagline?: string;
	/** Short facts, such as the year, runtime and genres, shown in a row. */
	meta?: string[];
	overview?: string;
	backdrop: string | null | undefined;
	poster: string | null | undefined;
	status?: TranscodeStatus;
	/** Why the transcode failed, when `status` is `failed`. Shown in full, unlike on a card. */
	failureReason?: string;
	/** The main actions, such as a `PlayButton`. */
	actions?: ReactNode;
};

type MediaHeroProps = { className?: string } & (
	| ({ loading?: false; error?: undefined } & MediaHeroData)
	| { loading: true; error?: undefined }
	| { loading?: false; error: ComponentProps<typeof ErrorState> }
);

const heroClassName = 'relative isolate flex min-h-[28rem] items-end overflow-hidden md:min-h-[34rem]';
const contentClassName = 'flex w-full flex-col gap-6 px-4 pt-32 pb-8 md:flex-row md:items-end md:px-8 md:pb-10';
const posterClassName = 'hidden w-48 shrink-0 rounded-lg ring-1 ring-border md:block lg:w-56';

/**
 * The top of a title's page: the backdrop large behind the title, with the poster, details, status
 * and the main actions. The backdrop fades into the page, so the text sits on the page's own color.
 */
export const MediaHero = (props: MediaHeroProps) => {
	if (props.error) {
		return <ErrorState {...props.error} className={cn('min-h-[28rem]', props.className)} />;
	}
	if (props.loading) {
		return (
			<div role="status" aria-label="Loading title" aria-busy="true" className={cn(heroClassName, props.className)}>
				<Skeleton className="absolute inset-0 -z-10 rounded-none" />
				<div className={contentClassName}>
					<Skeleton className={cn(posterClassName, 'aspect-2/3 ring-0')} />
					<div className="flex w-full max-w-prose flex-col gap-3">
						<Skeleton className="h-9 w-2/3 bg-card" />
						<Skeleton className="h-4 w-1/3 bg-card" />
						<Skeleton className="h-16 w-full bg-card" />
						<Skeleton className="h-9 w-28 bg-card" />
					</div>
				</div>
			</div>
		);
	}

	const { title, tagline, meta = [], overview, backdrop, poster, status, failureReason, actions, className } = props;

	return (
		<section aria-label={title} className={cn(heroClassName, className)}>
			<MediaImage src={backdrop} alt="" aspect="fill" loading="eager" className="absolute inset-0 -z-20" />
			<div
				aria-hidden="true"
				className="absolute inset-0 -z-10 bg-linear-to-t from-background via-background/85 to-background/30 md:bg-linear-to-r md:from-background md:via-background/80 md:to-background/10"
			/>
			<div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 bg-linear-to-t from-background to-transparent" />
			<div className={contentClassName}>
				<MediaImage src={poster} alt="" aspect="poster" loading="eager" className={posterClassName} />
				<div className="flex max-w-prose flex-col gap-3">
					<h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">{title}</h1>
					{tagline ? <p className="text-muted-foreground italic">{tagline}</p> : null}
					{meta.length > 0 || status ? (
						<div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
							{meta.length > 0 ? (
								<ul aria-label="Details" className="flex flex-wrap items-center gap-x-2">
									{meta.map((item, index) => (
										<li key={item} className="flex items-center gap-x-2">
											{index > 0 ? <span aria-hidden="true">·</span> : null}
											{item}
										</li>
									))}
								</ul>
							) : null}
							{status ? <StatusBadge status={status} failureReason={failureReason} /> : null}
						</div>
					) : null}
					{status === 'failed' && failureReason ? (
						<p role="alert" className="text-sm text-destructive">
							Preparing it failed: {failureReason}
						</p>
					) : null}
					{overview ? <p className="leading-relaxed text-pretty">{overview}</p> : null}
					{actions ? <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div> : null}
				</div>
			</div>
		</section>
	);
};
