import { useQuery } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@workspace/api-client';
import type { TranscodeStatus } from '@workspace/contract/api-types';
import { endpoints } from '@workspace/contract/endpoints';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { TooltipProvider } from '@workspace/ui/components/tooltip';
import { DataTable, type DataTableColumn, type DataTableSort } from '@workspace/ui/patterns/data-table';
import { FilterBar } from '@workspace/ui/patterns/filter-bar';
import { DateRangeFilter, FacetFilter, RangeFilter, type DateRange } from '@workspace/ui/patterns/filters';
import { MediaCard, MediaGrid, MediaRow } from '@workspace/ui/patterns/media-card';
import { MediaHero } from '@workspace/ui/patterns/media-hero';
import { MediaImage } from '@workspace/ui/patterns/media-image';
import { BackLink, PageHeader } from '@workspace/ui/patterns/page';
import { Pager } from '@workspace/ui/patterns/pager';
import { ConfirmDialog, SettingsSection } from '@workspace/ui/patterns/settings';
import { EmptyState, ErrorState, LoadingGrid } from '@workspace/ui/patterns/states';
import { PlayButton, StatusBadge } from '@workspace/ui/patterns/status';
import { VideoPlayer } from '@workspace/ui/patterns/video-player';
import { playlistQuery } from '@/features/player/player';
import poster from './poster.svg';
import { Section } from './section';

/**
 * Every pattern from `@workspace/ui/patterns`, in its main states, from fixture data rather than the
 * API, except the player, which asks the API for a prepared title's playlist, on `/dev/components`, which only `pnpm dev` serves. Keep this module free of top-level side
 * effects, or the build keeps them.
 */

type Movie = {
	id: number;
	title: string;
	year: number;
	runtime: number;
	image: string | null;
	status: TranscodeStatus | undefined;
	failureReason?: string;
};

/** Fixtures. `/missing-poster.jpg` is not an image, so it shows how a failed load falls back. */
const movies: Movie[] = [
	{ id: 1, title: 'The Dark Knight', year: 2008, runtime: 152, image: poster, status: 'ready' },
	{ id: 2, title: 'Heat', year: 1995, runtime: 170, image: poster, status: 'in progress' },
	{
		id: 3,
		title: 'Alien',
		year: 1979,
		runtime: 117,
		image: poster,
		status: 'failed',
		failureReason: 'The video has no audio track.',
	},
	{ id: 4, title: 'Ronin', year: 1998, runtime: 122, image: null, status: 'not ready' },
	{ id: 5, title: 'Blade Runner 2049', year: 2017, runtime: 164, image: '/missing-poster.jpg', status: undefined },
	{ id: 6, title: 'Spirited Away', year: 2001, runtime: 125, image: poster, status: 'ready' },
];

const statuses: (TranscodeStatus | undefined)[] = ['not ready', 'in progress', 'ready', 'failed'];

const toastPlay = (title: string) => toast.success(`Play ${title}`);
const toastRetry = (title: string) => toast.info(`Retry ${title}`);

/** Picks which state a pattern shows. */
const StatePicker = <T extends string>({
	label,
	states,
	value,
	onChange,
}: {
	label: string;
	states: readonly T[];
	value: T;
	onChange: (state: T) => void;
}) => (
	<div
		role="group"
		aria-label={label}
		className="flex w-fit flex-wrap gap-1 rounded-lg border border-border bg-card p-1"
	>
		{states.map((state) => (
			<Button
				key={state}
				size="sm"
				variant={value === state ? 'default' : 'ghost'}
				aria-pressed={value === state}
				onClick={() => onChange(state)}
			>
				{state}
			</Button>
		))}
	</div>
);

const collectionStates = ['Items', 'Loading', 'Empty', 'Error'] as const;
type CollectionState = (typeof collectionStates)[number];

const collectionProps = (state: CollectionState) => ({
	items: state === 'Items' ? movies : state === 'Empty' ? [] : undefined,
	loading: state === 'Loading',
	error:
		state === 'Error'
			? {
					title: 'Could not load the library',
					description: 'The server did not answer.',
					onRetry: () => toast('Try again'),
				}
			: undefined,
	empty: { title: 'No movies yet', description: 'Scan the library to fill it.' },
});

const renderCard = (movie: Movie) => (
	<MediaCard
		href={`#movie-${movie.id}`}
		title={movie.title}
		subtitle={String(movie.year)}
		image={movie.image}
		status={movie.status}
		failureReason={movie.failureReason}
		onPlay={() => toastPlay(movie.title)}
		onRetry={() => toastRetry(movie.title)}
	/>
);

const Headers = () => (
	<div className="flex flex-col gap-4 rounded-lg border border-border p-4">
		<PageHeader
			title="Settings"
			description="Your account, the library and backups."
			back={{ href: '#patterns', label: 'Back to Movies' }}
			actions={<Button variant="outline">Log out</Button>}
		/>
		<BackLink href="#patterns" label="Movies" />
	</div>
);

const Pages = () => {
	const [page, setPage] = useState(2);
	return (
		<div className="rounded-lg border border-border p-4">
			<Pager page={page} pageCount={5} onPageChange={setPage} label="Preview pages" />
		</div>
	);
};

const Status = () => (
	<div className="flex flex-col gap-4">
		<div className="flex flex-wrap items-center gap-2">
			{statuses.map((status) => (
				<StatusBadge
					key={status}
					status={status}
					failureReason={status === 'failed' ? 'The video has no audio track.' : undefined}
				/>
			))}
		</div>
		<div className="flex flex-wrap items-center gap-2">
			{statuses.map((status) => (
				<PlayButton
					key={status}
					title="Heat"
					status={status}
					onPlay={() => toastPlay('Heat')}
					onRetry={() => toastRetry('Heat')}
				/>
			))}
			<PlayButton title="Heat" status="ready" onPlay={() => toastPlay('Heat')} disabled />
		</div>
		<div className="flex flex-wrap items-center gap-2">
			{statuses.map((status) => (
				<PlayButton
					key={status}
					title="Heat"
					status={status}
					size="icon"
					onPlay={() => toastPlay('Heat')}
					onRetry={() => toastRetry('Heat')}
				/>
			))}
		</div>
	</div>
);

const Images = () => (
	<div className="flex flex-col gap-4">
		<ul className="grid grid-cols-3 gap-3 sm:max-w-xl">
			{[
				{ caption: 'Loaded', src: poster },
				{ caption: 'Missing', src: null },
				{ caption: 'Failed to load', src: '/missing-poster.jpg' },
			].map(({ caption, src }) => (
				<li key={caption} className="flex flex-col gap-2">
					<MediaImage src={src} alt="The Dark Knight" className="rounded-lg" />
					<p className="font-mono text-xs text-muted-foreground">{caption}</p>
				</li>
			))}
		</ul>
		<MediaImage src={null} alt="Heat" aspect="backdrop" className="max-w-xl rounded-lg" />
	</div>
);

const Grid = () => {
	const [state, setState] = useState<CollectionState>('Items');
	return (
		<div className="flex flex-col gap-4">
			<StatePicker label="Grid state" states={collectionStates} value={state} onChange={setState} />
			<MediaGrid label="Movies" getKey={(movie) => movie.id} renderItem={renderCard} {...collectionProps(state)} />
		</div>
	);
};

const Row = () => {
	const [state, setState] = useState<CollectionState>('Items');
	return (
		<div className="flex flex-col gap-4">
			<StatePicker label="Row state" states={collectionStates} value={state} onChange={setState} />
			<MediaRow
				title="Recently added"
				action={
					<Button variant="link" size="sm">
						See all
					</Button>
				}
				getKey={(movie) => movie.id}
				renderItem={renderCard}
				{...collectionProps(state)}
			/>
		</div>
	);
};

const heroStates = ['Ready', 'Failed', 'Loading', 'Error'] as const;

const Hero = () => {
	const [state, setState] = useState<(typeof heroStates)[number]>('Ready');
	const failed = state === 'Failed';
	const status: TranscodeStatus = failed ? 'failed' : 'ready';

	return (
		<div className="flex flex-col gap-4">
			<StatePicker label="Hero state" states={heroStates} value={state} onChange={setState} />
			<div className="overflow-hidden rounded-lg border border-border">
				{state === 'Loading' ? (
					<MediaHero loading />
				) : state === 'Error' ? (
					<MediaHero error={{ title: 'Could not load this title', onRetry: () => toast('Try again') }} />
				) : (
					<MediaHero
						title="The Dark Knight"
						tagline="Why so serious?"
						meta={['2008', '2h 32m', 'Action', 'Crime']}
						overview="Batman raises the stakes in his war on crime, until a criminal mastermind known as the Joker pushes Gotham into anarchy."
						backdrop={poster}
						poster={poster}
						status={status}
						failureReason={failed ? 'The video has no audio track.' : undefined}
						actions={
							<>
								<PlayButton
									title="The Dark Knight"
									status={status}
									onPlay={() => toastPlay('The Dark Knight')}
									onRetry={() => toastRetry('The Dark Knight')}
								/>
								<Button variant="secondary" size="lg">
									Details
								</Button>
							</>
						}
					/>
				)}
			</div>
		</div>
	);
};

const sortOptions = [
	{ value: 'title', label: 'Title' },
	{ value: 'release', label: 'Release date' },
	{ value: 'runtime', label: 'Runtime' },
] as const;
type Sort = (typeof sortOptions)[number]['value'];

const genres = [
	{ value: 'action', label: 'Action', count: 24 },
	{ value: 'crime', label: 'Crime', count: 12 },
	{ value: 'drama', label: 'Drama', count: 31 },
	{ value: 'science-fiction', label: 'Science Fiction', count: 9 },
];

const runtimeBounds: [number, number] = [60, 240];

const Filters = () => {
	const [search, setSearch] = useState('');
	const [sort, setSort] = useState<Sort>('title');
	const [runtime, setRuntime] = useState<[number, number]>(runtimeBounds);
	const [released, setReleased] = useState<DateRange>({});
	const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
	const activeFilterCount =
		Number(runtime[0] !== runtimeBounds[0] || runtime[1] !== runtimeBounds[1]) +
		Number(Boolean(released.from || released.to)) +
		Number(selectedGenres.length > 0);

	return (
		<div className="flex flex-col gap-4">
			<FilterBar
				search={search}
				onSearchChange={setSearch}
				searchPlaceholder="Title or year"
				sort={sort}
				sortOptions={[...sortOptions]}
				onSortChange={setSort}
				activeFilterCount={activeFilterCount}
				onClearFilters={() => {
					setRuntime(runtimeBounds);
					setReleased({});
					setSelectedGenres([]);
				}}
				filters={
					<>
						<FacetFilter label="Genres" options={genres} selected={selectedGenres} onChange={setSelectedGenres} />
						<RangeFilter
							label="Runtime"
							min={runtimeBounds[0]}
							max={runtimeBounds[1]}
							step={5}
							value={runtime}
							onChange={setRuntime}
							formatValue={(minutes) => `${minutes} min`}
						/>
						<DateRangeFilter label="Released" value={released} onChange={setReleased} />
					</>
				}
			/>
			<pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">
				{JSON.stringify({ search, sort, runtime, released, genres: selectedGenres }, null, 2)}
			</pre>
			<div className="grid gap-4 sm:grid-cols-3">
				<FacetFilter label="Loading" options={[]} selected={[]} onChange={() => {}} loading />
				<FacetFilter label="Empty" options={[]} selected={[]} onChange={() => {}} />
				<FacetFilter
					label="Error"
					options={[]}
					selected={[]}
					onChange={() => {}}
					error="Could not load the genres."
					onRetry={() => toast('Try again')}
				/>
			</div>
		</div>
	);
};

/** What the API answers for a title's playlist, as text, until there is one to play. */
const PreparedTitle = ({ id }: { id: number }) => {
	const { onSessionLost } = useRouteContext({ from: '__root__' });
	const { data, error, isPending } = useQuery(playlistQuery(id));

	if (isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
	if (error) {
		const notReady = error instanceof ApiError && error.code === 'not_found';
		return (
			<p role="alert" className="text-sm text-destructive">
				{notReady ? 'This title is not ready to play.' : 'Could not load this title.'}
			</p>
		);
	}

	return (
		<VideoPlayer
			src={data.playlistUrl}
			title="A prepared title"
			// eslint-disable-next-line turbo/no-undeclared-env-vars -- Vite sets DEV, and it is false in a build.
			debug={import.meta.env.DEV}
			onUnauthorized={onSessionLost}
			onFatalError={(reason) => toast.error(`Playback failed: ${reason}`)}
			className="max-w-4xl"
		/>
	);
};

/**
 * Plays a title the API has prepared. It asks the API for the playlist, as `/watch/$id` does, so it
 * needs a session, and a 401 from the API or the stream goes to login.
 */
const Player = () => {
	const [input, setInput] = useState('');
	const [id, setId] = useState<number>();
	const [inputError, setInputError] = useState<string>();

	const load = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const parsed = endpoints.transcodePlaylist.params.safeParse({ id: input });
		setInputError(parsed.success ? undefined : parsed.error.issues[0]?.message);
		setId(parsed.success ? parsed.data.id : undefined);
	};

	return (
		<div className="flex flex-col gap-4">
			<form onSubmit={load} noValidate className="flex max-w-sm flex-wrap items-end gap-2">
				<div className="flex flex-1 flex-col gap-1.5">
					<Label htmlFor="player-title">TMDB id of a prepared title</Label>
					<Input
						id="player-title"
						inputMode="numeric"
						value={input}
						aria-invalid={Boolean(inputError) || undefined}
						aria-describedby={inputError ? 'player-title-error' : undefined}
						onChange={(event) => setInput(event.target.value)}
					/>
				</div>
				<Button type="submit" variant="outline">
					Load
				</Button>
				{inputError ? (
					<p id="player-title-error" className="basis-full text-sm text-destructive">
						{inputError}
					</p>
				) : null}
			</form>
			{id === undefined ? (
				<p className="max-w-prose text-sm text-muted-foreground">
					Give the id of a movie whose status is ready. Without a session, Load goes to login and comes back here. Space
					or K plays, the arrows seek and change the volume, M mutes and F goes full screen.
				</p>
			) : (
				<PreparedTitle key={id} id={id} />
			)}
		</div>
	);
};

type BackupFile = { name: string; size: number; created: string };
const backups: BackupFile[] = [
	{ name: 'showstream-2026-11-03.db', size: 18.4, created: '2026-11-03' },
	{ name: 'showstream-2026-11-02.db', size: 18.1, created: '2026-11-02' },
	{ name: 'showstream-2026-10-28.db', size: 16.9, created: '2026-10-28' },
];
const backupColumns: DataTableColumn<BackupFile>[] = [
	{ id: 'name', header: 'File', cell: (row) => <span className="font-mono text-xs">{row.name}</span>, sortable: true },
	{ id: 'size', header: 'Size', cell: (row) => `${row.size} MB`, sortable: true },
	{ id: 'created', header: 'Created', cell: (row) => row.created, sortable: true },
];
const tableStates = ['Rows', 'Loading', 'Empty', 'Error'] as const;

/** What a screen does: the table asks for a sort, and the screen sorts. */
const sortBackups = (rows: BackupFile[], sort: DataTableSort) =>
	[...rows].sort((a, b) => {
		const key = sort.column as keyof BackupFile;
		const order = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
		return sort.direction === 'ascending' ? order : -order;
	});

const Admin = () => {
	const [sort, setSort] = useState<DataTableSort>({ column: 'created', direction: 'descending' });
	const [state, setState] = useState<(typeof tableStates)[number]>('Rows');

	return (
		<div className="flex flex-col gap-8">
			<SettingsSection title="Backups" description="The worker writes one a day, and keeps the last 7.">
				<p className="text-sm">The latest backup is from today.</p>
				<ConfirmDialog
					trigger={<Button variant="destructive">Delete old backups</Button>}
					title="Delete old backups?"
					description="This keeps today's backup and deletes the others. It cannot be undone."
					confirmLabel="Delete"
					destructive
					onConfirm={() =>
						new Promise<void>((resolve) => {
							setTimeout(() => {
								toast.success('Deleted 2 backups');
								resolve();
							}, 1000);
						})
					}
				/>
			</SettingsSection>
			<div className="flex flex-col gap-4">
				<StatePicker label="Table state" states={tableStates} value={state} onChange={setState} />
				<DataTable
					caption="Backups"
					columns={backupColumns}
					rows={state === 'Rows' ? sortBackups(backups, sort) : []}
					getRowId={(row) => row.name}
					sort={sort}
					onSortChange={setSort}
					loading={state === 'Loading'}
					empty={{ title: 'No backups yet', description: 'The first one is written tonight.' }}
					error={
						state === 'Error' ? { title: 'Could not load the backups', onRetry: () => toast('Try again') } : undefined
					}
				/>
			</div>
		</div>
	);
};

const States = () => (
	<div className="grid gap-4 lg:grid-cols-2">
		<div className="rounded-lg border border-border">
			<EmptyState
				title="No movies yet"
				description="Scan the library to fill it."
				action={<Button>Scan library</Button>}
			/>
		</div>
		<div className="rounded-lg border border-border">
			<ErrorState
				title="Could not load the library"
				description="The server did not answer."
				onRetry={() => toast('Try again')}
			/>
		</div>
		<div className="rounded-lg border border-border p-4 lg:col-span-2">
			<LoadingGrid label="Loading movies" count={6} />
		</div>
	</div>
);

export const PatternsSection = () => (
	<TooltipProvider>
		<div className="flex flex-col gap-12">
			<Section
				title="App shell"
				description="This page is inside AppShell: the sidebar collapses with its button or Ctrl+B, and at phone width it becomes the bottom bar, with More for the theme."
			>
				{null}
			</Section>
			<Section title="Page header" description="With a way back, and a way back on its own, as a title's page has.">
				<Headers />
			</Section>
			<Section title="Status and Play" description="Each status, a failure with its reason, and Play in every state.">
				<Status />
			</Section>
			<Section
				title="Media image"
				description="A poster that loaded, one that is missing, one that failed, and a backdrop."
			>
				<Images />
			</Section>
			<Section title="Media grid and cards">
				<Grid />
			</Section>
			<Section title="Pager" description="Previous and Next for a list the server pages. It hides at one page.">
				<Pages />
			</Section>
			<Section title="Media row" description="Scrolls sideways. Tab moves through the cards.">
				<Row />
			</Section>
			<Section title="Media hero">
				<Hero />
			</Section>
			<Section
				title="Filters"
				description="The values below show what the bar emits. At phone width the filters open in a sheet."
			>
				<Filters />
			</Section>
			<Section title="Video player">
				<Player />
			</Section>
			<Section title="Settings, confirm and table">
				<Admin />
			</Section>
			<Section title="Empty, error and loading">
				<States />
			</Section>
		</div>
	</TooltipProvider>
);
