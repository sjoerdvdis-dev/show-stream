import type { ReactNode } from 'react';

/** One part of a layer on `/dev/components`. */
export const Section = ({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) => (
	<section className="flex flex-col gap-4" aria-label={title}>
		<div className="flex flex-col gap-1">
			<h3 className="text-xl font-semibold">{title}</h3>
			{description ? <p className="max-w-prose text-sm text-muted-foreground">{description}</p> : null}
		</div>
		{children}
	</section>
);

/** A layer of the design system on `/dev/components`: the theme, the primitives or the patterns. */
export const Layer = ({
	id,
	title,
	description,
	children,
}: {
	id: string;
	title: string;
	description: ReactNode;
	children: ReactNode;
}) => (
	<section id={id} aria-labelledby={`${id}-heading`} className="flex scroll-mt-4 flex-col gap-12">
		<div className="flex flex-col gap-2 border-b border-border pb-4">
			<h2 id={`${id}-heading`} className="text-2xl font-semibold tracking-tight">
				{title}
			</h2>
			<p className="max-w-prose text-muted-foreground">{description}</p>
		</div>
		{children}
	</section>
);
