import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@workspace/ui/lib/utils';
import { AppLink } from '@workspace/ui/patterns/link';

const widths = {
	/** Text and forms, such as Settings. */
	narrow: 'max-w-3xl',
	/** Libraries and grids. */
	default: 'max-w-7xl',
	/** Edge to edge, such as a hero or the player. */
	full: 'max-w-none',
};

/** The same width and padding on every page. */
export const PageContainer = ({
	width = 'default',
	className,
	children,
}: {
	width?: keyof typeof widths;
	className?: string;
	children: ReactNode;
}) => (
	<div className={cn('mx-auto flex w-full flex-col gap-6 px-4 py-6 md:px-8 md:py-8', widths[width], className)}>
		{children}
	</div>
);

/** The page's title area: an optional way back, the `h1`, a description, and the page's actions. */
export const PageHeader = ({
	title,
	description,
	actions,
	back,
	className,
}: {
	title: string;
	description?: ReactNode;
	actions?: ReactNode;
	/** A link to the page above, such as Movies from a title. */
	back?: { href: string; label: string };
	className?: string;
}) => (
	<header className={cn('flex flex-col gap-2', className)}>
		{back ? (
			<AppLink
				href={back.href}
				className="-ml-1 flex w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<ChevronLeft aria-hidden="true" className="size-4" />
				{back.label}
			</AppLink>
		) : null}
		<div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
			<div className="flex min-w-0 flex-col gap-1">
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
				{description ? <p className="max-w-prose text-sm text-muted-foreground">{description}</p> : null}
			</div>
			{actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
		</div>
	</header>
);
