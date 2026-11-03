import { useSyncExternalStore, type ReactNode } from 'react';
import poster from './poster.svg';
import { ThemeSwitch } from './theme-switch';

/**
 * Every token from `@workspace/ui/tokens.css`, rendered for review. Dev only: the route at
 * `/dev/theme` uses this only under `pnpm dev`, so a build leaves it out. Keep this module free of
 * top-level side effects, or the build keeps them.
 * Phase 2 item 4 folds it into `/dev/components`.
 */

const tokenGroups: { title: string; tokens: string[] }[] = [
	{
		title: 'Surfaces',
		tokens: ['background', 'card', 'popover', 'muted', 'secondary'],
	},
	{
		title: 'Text',
		tokens: ['foreground', 'muted-foreground', 'card-foreground', 'popover-foreground', 'secondary-foreground'],
	},
	{
		title: 'Accent',
		tokens: ['primary', 'primary-foreground', 'ring'],
	},
	{
		title: 'Status',
		tokens: ['destructive', 'destructive-foreground', 'success', 'warning', 'info'],
	},
	{
		title: 'Lines and hover fills',
		tokens: ['border', 'input', 'accent', 'accent-foreground'],
	},
	{
		title: 'Charts',
		tokens: ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'],
	},
	{
		title: 'Sidebar',
		tokens: [
			'sidebar',
			'sidebar-foreground',
			'sidebar-primary',
			'sidebar-primary-foreground',
			'sidebar-accent',
			'sidebar-accent-foreground',
			'sidebar-border',
			'sidebar-ring',
		],
	},
	{
		title: 'Overlay',
		tokens: ['overlay', 'overlay-foreground'],
	},
];

const surfaces = [
	{ name: 'background', className: 'bg-background' },
	{ name: 'card', className: 'bg-card' },
	{ name: 'popover', className: 'bg-popover' },
	{ name: 'muted', className: 'bg-muted' },
	{ name: 'secondary', className: 'bg-secondary' },
];

const statuses = [
	{ name: 'success', dot: 'bg-success', text: 'text-success', message: 'Ready to play' },
	{ name: 'warning', dot: 'bg-warning', text: 'text-warning', message: 'Transcode in progress' },
	{ name: 'info', dot: 'bg-info', text: 'text-info', message: 'Scan queued' },
	{ name: 'destructive', dot: 'bg-destructive', text: 'text-destructive', message: 'Transcode failed' },
];

const buttonBase = 'rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60';
const buttons = {
	primary: `${buttonBase} bg-primary text-primary-foreground`,
	secondary: `${buttonBase} bg-secondary text-secondary-foreground`,
	destructive: `${buttonBase} bg-destructive text-destructive-foreground`,
	outline: `${buttonBase} border border-border bg-transparent`,
};
const fieldClass = 'w-full rounded-md border border-input bg-transparent px-3 py-2';
/** The same ring `:focus-visible` draws, shown without focus so that it can be compared. */
const shownRing = 'outline-2 outline-offset-2 outline-ring';

/** Renders again when the `dark` class on `<html>` changes, which is after the provider applies it. */
const subscribeToRootClass = (onChange: () => void) => {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
	return () => observer.disconnect();
};

/** The values the page is using now, which change with the theme. */
const useTokenValues = (): Record<string, string> => {
	useSyncExternalStore(subscribeToRootClass, () => document.documentElement.className);
	const style = getComputedStyle(document.documentElement);
	const tokenNames = [...tokenGroups.flatMap(({ tokens }) => tokens), 'radius'];
	return Object.fromEntries(tokenNames.map((name) => [name, style.getPropertyValue(`--${name}`).trim()]));
};

const Section = ({ title, description, children }: { title: string; description?: string; children: ReactNode }) => (
	<section className="flex flex-col gap-4" aria-label={title}>
		<div className="flex flex-col gap-1">
			<h2 className="text-xl font-semibold">{title}</h2>
			{description ? <p className="max-w-prose text-sm text-muted-foreground">{description}</p> : null}
		</div>
		{children}
	</section>
);

const Swatches = ({ values }: { values: Record<string, string> }) => (
	<div className="flex flex-col gap-6">
		{tokenGroups.map(({ title, tokens }) => (
			<div key={title} className="flex flex-col gap-2">
				<h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
				<ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{tokens.map((name) => (
						<li key={name} className="flex items-center gap-3 rounded-lg border border-border bg-card p-2">
							<span
								aria-hidden="true"
								className="size-10 shrink-0 rounded-md border border-border"
								style={{ backgroundColor: `var(--${name})` }}
							/>
							<span className="flex min-w-0 flex-col">
								<span className="font-mono text-sm">--{name}</span>
								<span className="truncate font-mono text-xs text-muted-foreground">{values[name] ?? ''}</span>
							</span>
						</li>
					))}
				</ul>
			</div>
		))}
	</div>
);

const TextOnSurfaces = () => (
	<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{surfaces.map(({ name, className }) => (
			<li key={name} className={`flex flex-col gap-2 rounded-lg border border-border p-4 ${className}`}>
				<p className="font-mono text-xs text-muted-foreground">on {name}</p>
				<p className="font-semibold">The Dark Knight (2008)</p>
				<p className="text-sm">Batman faces the Joker in Gotham.</p>
				<p className="text-sm text-muted-foreground">2h 32m · Action, Crime</p>
				<a href="#text-on-surfaces" className="text-sm text-primary underline underline-offset-4">
					A link in the accent
				</a>
				<p className="flex flex-wrap gap-x-3 text-sm">
					{statuses.map((status) => (
						<span key={status.name} className={status.text}>
							{status.name}
						</span>
					))}
				</p>
			</li>
		))}
	</ul>
);

const Actions = () => (
	<div className="flex flex-col gap-4">
		<div className="flex flex-wrap gap-2">
			<button type="button" className={buttons.primary}>
				Play
			</button>
			<button type="button" className={buttons.secondary}>
				Add to list
			</button>
			<button type="button" className={buttons.outline}>
				Details
			</button>
			<button type="button" className={buttons.destructive}>
				Delete
			</button>
			<button type="button" className={buttons.primary} disabled>
				Disabled
			</button>
		</div>
		<label className="flex max-w-sm flex-col gap-1">
			<span>Search the library</span>
			<input className={fieldClass} placeholder="Title or year" />
		</label>
		<label className="flex max-w-sm flex-col gap-1">
			<span>Username</span>
			<input className={`${fieldClass} border-destructive`} aria-invalid="true" defaultValue="a" />
			<span className="text-sm text-destructive">A username has at least 3 characters.</span>
		</label>
	</div>
);

const Statuses = () => (
	<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
		{['bg-background', 'bg-card'].map((surface) => (
			<li key={surface} className={`flex flex-col gap-2 rounded-lg border border-border p-4 ${surface}`}>
				{statuses.map((status) => (
					<p key={status.name} className="flex items-center gap-2 text-sm">
						<span aria-hidden="true" className={`size-2.5 rounded-full ${status.dot}`} />
						<span className={`font-medium ${status.text}`}>{status.message}</span>
						<span className="font-mono text-xs text-muted-foreground">{status.name}</span>
					</p>
				))}
			</li>
		))}
	</ul>
);

const FocusRings = () => (
	<div className="flex flex-col gap-4">
		<div className="flex flex-wrap items-center gap-4">
			<button type="button" className={`${buttons.primary} ${shownRing}`}>
				Play
			</button>
			<button type="button" className={`${buttons.secondary} ${shownRing}`}>
				Add to list
			</button>
			<a href="#focus-rings" className={`rounded-sm underline underline-offset-4 ${shownRing}`}>
				A link
			</a>
			<input className={`${fieldClass} max-w-48 ${shownRing}`} aria-label="A field with its focus ring" />
		</div>
		<div className="flex flex-wrap items-center gap-3 rounded-lg bg-card p-4">
			<p className="w-full text-sm text-muted-foreground">Press Tab to move through these.</p>
			<button type="button" className={buttons.primary}>
				First
			</button>
			<button type="button" className={buttons.outline}>
				Second
			</button>
			<a href="#focus-rings" className="rounded-sm underline underline-offset-4">
				Third
			</a>
		</div>
	</div>
);

const Poster = ({ children }: { children: ReactNode }) => (
	<figure className="relative aspect-[2/3] w-full overflow-hidden rounded-lg">
		<img src={poster} alt="" className="absolute inset-0 size-full object-cover" />
		{children}
	</figure>
);

const Overlays = () => (
	<ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<li className="flex flex-col gap-2">
			<Poster>{null}</Poster>
			<p className="font-mono text-xs text-muted-foreground">no overlay</p>
		</li>
		<li className="flex flex-col gap-2">
			<Poster>
				<div className="absolute inset-0 bg-overlay/25" />
			</Poster>
			<p className="font-mono text-xs text-muted-foreground">bg-overlay/25</p>
		</li>
		<li className="flex flex-col gap-2">
			<Poster>
				<div className="absolute inset-0 flex items-center justify-center bg-overlay/75 p-3 text-center text-overlay-foreground">
					<span className="font-semibold">Transcode in progress</span>
				</div>
			</Poster>
			<p className="font-mono text-xs text-muted-foreground">bg-overlay/75</p>
		</li>
		<li className="flex flex-col gap-2">
			<Poster>
				<figcaption className="absolute inset-x-0 bottom-0 flex flex-col bg-linear-to-t from-overlay/90 via-overlay/75 to-transparent p-3 pt-12 text-overlay-foreground">
					<span className="font-semibold">The Dark Knight</span>
					<span className="text-sm">2008 · 2h 32m</span>
				</figcaption>
			</Poster>
			<p className="font-mono text-xs text-muted-foreground">from-overlay/90 to-transparent</p>
		</li>
	</ul>
);

const Fonts = () => (
	<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
			<p className="font-mono text-xs text-muted-foreground">Geist Sans · font-sans</p>
			<p className="text-3xl font-semibold tracking-tight">Movies you own, anywhere</p>
			<p className="text-xl font-medium">Continue watching</p>
			<p>A self-hosted media server that plays your library in the browser.</p>
			<p className="text-sm text-muted-foreground">Regular 400 · Medium 500 · Semibold 600 · Bold 700</p>
			<p className="flex gap-4">
				<span className="font-normal">Aa</span>
				<span className="font-medium">Aa</span>
				<span className="font-semibold">Aa</span>
				<span className="font-bold">Aa</span>
			</p>
		</div>
		<div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 font-mono">
			<p className="text-xs text-muted-foreground">Geist Mono · font-mono</p>
			<p className="text-sm">1920×1080 · H.264 · AAC 5.1 · 23.976 fps</p>
			<p className="text-sm">01:52:07 / 02:32:00</p>
			<p className="text-sm">media/movies/The Dark Knight (2008)/</p>
			<p className="text-sm tabular-nums">0123456789</p>
		</div>
	</div>
);

const Radius = ({ value }: { value?: string }) => (
	<div className="flex flex-col gap-3">
		<p className="font-mono text-sm text-muted-foreground">--radius: {value}</p>
		<ul className="flex flex-wrap gap-3">
			{['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl'].map((radius) => (
				<li
					key={radius}
					className={`flex size-24 items-end border border-border bg-muted p-2 font-mono text-xs ${radius}`}
				>
					{radius}
				</li>
			))}
		</ul>
	</div>
);

export const ThemePreview = () => {
	const values = useTokenValues();

	return (
		<main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-8">
			<header className="flex flex-col gap-4">
				<h1 className="text-3xl font-semibold tracking-tight">Theme preview</h1>
				<p className="max-w-prose text-muted-foreground">
					Every token in <code className="font-mono text-sm">@workspace/ui/tokens.css</code>, in the theme chosen here.
					Only <code className="font-mono text-sm">pnpm dev</code> serves this page.
				</p>
				<ThemeSwitch />
			</header>
			<Section title="Tokens">
				<Swatches values={values} />
			</Section>
			<Section title="Text on each surface" description="Foreground, muted text, a link and status text.">
				<div id="text-on-surfaces">
					<TextOnSurfaces />
				</div>
			</Section>
			<Section
				title="Actions"
				description="The accent is for the main action on a screen, and destructive for what cannot be undone."
			>
				<Actions />
			</Section>
			<Section title="Status" description="Success, warning, info and destructive, on the page and on a card.">
				<Statuses />
			</Section>
			<Section title="Focus rings" description="The ring follows the accent. The first row shows it without focus.">
				<div id="focus-rings">
					<FocusRings />
				</div>
			</Section>
			<Section
				title="Overlay on a poster"
				description="The overlay is dark in both themes, because it sits over artwork."
			>
				<Overlays />
			</Section>
			<Section title="Fonts">
				<Fonts />
			</Section>
			<Section title="Radius">
				<Radius value={values.radius} />
			</Section>
		</main>
	);
};
