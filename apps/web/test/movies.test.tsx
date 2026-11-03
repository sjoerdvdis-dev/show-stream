import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { startFakeApi, type FakeMovie } from './support/fake-api';
import { fakeSocket } from './support/fake-socket';
import { currentPath, openApp } from './support/render-app';

const numbered = (count: number): FakeMovie[] =>
	Array.from({ length: count }, (_, index) => ({
		id: index + 1,
		title: `Movie ${String(index + 1).padStart(2, '0')}`,
	}));

const library: FakeMovie[] = [
	{ id: 1, title: 'Alien', year: 1979, genres: ['Horror', 'Science Fiction'], status: 'ready' },
	{ id: 2, title: 'Heat', year: 1995, genres: ['Crime', 'Drama'], status: 'not ready' },
	{ id: 3, title: 'Ronin', year: 1998, genres: ['Crime', 'Action'], status: 'in progress' },
	{
		id: 4,
		title: 'Solaris',
		year: 1972,
		genres: ['Drama', 'Science Fiction'],
		status: 'failed',
		failureReason: 'The video has no audio track.',
	},
];

const findGrid = () => screen.findByRole('list', { name: 'Movies' });

/** The titles in the grid, in order. A card's link reads its title and year. */
const titlesIn = (grid: HTMLElement) =>
	within(grid)
		.getAllByRole('link')
		.map((link) => link.textContent);

const shownTitles = async () => titlesIn(await findGrid());

const search = () => new URLSearchParams(window.location.search);

/** The toast that says `text`, so that its action is the one clicked. */
const findToast = async (text: string) => {
	const toast = (await screen.findByText(text)).closest<HTMLElement>('[data-sonner-toast]');
	if (!toast) throw new Error(`No toast says ${text}`);
	return within(toast);
};

const openFilters = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.click(screen.getByRole('button', { name: /^Filters/ }));
	return screen.findByRole('dialog', { name: 'Filters' });
};

describe('the movie library', () => {
	it('shows a page of posters, and moves between pages', async () => {
		startFakeApi({ signedIn: true, movies: numbered(30) });
		const user = userEvent.setup();

		openApp('/movies');

		const firstPage = await shownTitles();
		expect(firstPage).toHaveLength(24);
		expect(firstPage[0]).toBe('Movie 01');

		await user.click(screen.getByRole('button', { name: 'Next page' }));

		await screen.findByRole('link', { name: 'Movie 25' });
		expect(await shownTitles()).toHaveLength(6);
		expect(window.location.search).toBe('?page=2');
		expect(screen.getByText('Page 2 of 2')).toBeTruthy();
	});

	it('keeps search, sort and filters through a reload', async () => {
		startFakeApi({ signedIn: true, movies: library });
		const user = userEvent.setup();

		const { unmount } = openApp('/movies');
		await findGrid();
		await user.click(screen.getByRole('combobox', { name: 'Sort by' }));
		await user.click(await screen.findByRole('option', { name: 'Year, newest first' }));
		const panel = await openFilters(user);
		await user.click(within(panel).getByRole('checkbox', { name: /Crime/ }));

		await waitFor(async () => expect(await shownTitles()).toEqual(['Ronin1998', 'Heat1995']));
		expect(search().get('sort')).toBe('year');
		expect(search().get('order')).toBe('desc');
		expect(search().getAll('genre')).toEqual(['Crime']);

		unmount();
		openApp(window.location.pathname + window.location.search);

		expect(await shownTitles()).toEqual(['Ronin1998', 'Heat1995']);
		expect(screen.getByRole('combobox', { name: 'Sort by' }).textContent).toContain('Year, newest first');
		expect(screen.getByRole('button', { name: 'Filters, 1 active' })).toBeTruthy();
	});

	it('falls back from a value it does not understand, and keeps the rest', async () => {
		startFakeApi({ signedIn: true, movies: library });

		openApp('/movies?sort=loudness&yearMin=soon&genre=Drama&page=0');

		expect(await shownTitles()).toEqual(['Heat1995', 'Solaris1972']);
		expect(screen.getByRole('combobox', { name: 'Sort by' }).textContent).toContain('Title, A to Z');
		expect(screen.getByRole('button', { name: 'Filters, 1 active' })).toBeTruthy();
	});

	it('goes back to the first page when a filter changes', async () => {
		startFakeApi({
			signedIn: true,
			movies: numbered(30).map((movie, index) => ({ ...movie, genres: index % 2 ? ['Drama'] : ['Comedy'] })),
		});
		const user = userEvent.setup();

		openApp('/movies?page=2');
		await screen.findByRole('link', { name: 'Movie 25' });
		const panel = await openFilters(user);
		await user.click(within(panel).getByRole('checkbox', { name: /Drama/ }));

		await screen.findByRole('link', { name: 'Movie 02' });
		expect(search().get('page')).toBeNull();
		expect(search().getAll('genre')).toEqual(['Drama']);
	});

	it('searches once typing settles, without a history entry per search', async () => {
		startFakeApi({ signedIn: true, movies: library });
		const user = userEvent.setup();

		openApp('/movies');
		await findGrid();
		const entries = window.history.length;
		await user.type(screen.getByRole('searchbox', { name: 'Search movies' }), 'ron');

		await waitFor(async () => expect(await shownTitles()).toEqual(['Ronin1998']));
		expect(search().get('q')).toBe('ron');
		expect(window.history.length).toBe(entries);
	});

	it('moves back and forward through filter changes, and leaves defaults out of the URL', async () => {
		startFakeApi({ signedIn: true, movies: library });
		const user = userEvent.setup();

		openApp('/movies');
		await findGrid();
		await user.click(screen.getByRole('combobox', { name: 'Sort by' }));
		await user.click(await screen.findByRole('option', { name: 'Title, Z to A' }));
		await waitFor(() => expect(search().get('order')).toBe('desc'));
		await user.click(screen.getByRole('combobox', { name: 'Sort by' }));
		await user.click(await screen.findByRole('option', { name: 'Title, A to Z' }));

		await waitFor(() => expect(window.location.search).toBe(''));

		act(() => window.history.back());

		await waitFor(() => expect(search().get('order')).toBe('desc'));
		expect(await shownTitles()).toEqual(['Solaris1972', 'Ronin1998', 'Heat1995', 'Alien1979']);
	});

	it('offers the genres and statuses that the library has, with counts', async () => {
		startFakeApi({ signedIn: true, movies: library });
		const user = userEvent.setup();

		openApp('/movies');
		await findGrid();
		const panel = await openFilters(user);

		const genres = within(await within(panel).findByRole('group', { name: 'Genre' })).getAllByRole('checkbox');
		expect(genres.map((box) => box.closest('label')?.textContent)).toEqual([
			'Action1',
			'Crime2',
			'Drama2',
			'Horror1',
			'Science Fiction2',
		]);
		const failed = within(within(panel).getByRole('group', { name: 'Status' })).getByRole('checkbox', {
			name: /Failed/,
		});
		expect(failed.closest('label')?.textContent).toBe('Failed1');
		expect(within(panel).getByText('Year')).toBeTruthy();
	});
});

describe('the states of the library', () => {
	it('shows placeholders while it loads', async () => {
		startFakeApi({ signedIn: true, movies: library, moviesDelayMs: 300 });

		openApp('/movies');

		expect(await screen.findByRole('status', { name: 'Loading movies' })).toBeTruthy();
		expect(await findGrid()).toBeTruthy();
	});

	it('offers to try again when it cannot load', async () => {
		const api = startFakeApi({ signedIn: true, movies: library, libraryFails: true });
		const user = userEvent.setup();

		openApp('/movies');
		await screen.findByRole('heading', { name: 'Could not load the movies' });
		api.libraryFails = false;
		await user.click(screen.getByRole('button', { name: 'Try again' }));

		expect(await shownTitles()).toHaveLength(4);
	});

	it('points an admin with an empty library to Settings to scan', async () => {
		startFakeApi({ signedIn: true, role: 'admin' });

		openApp('/movies');

		expect(await screen.findByRole('heading', { name: 'No movies yet' })).toBeTruthy();
		expect(screen.getByText('Scan the library in Settings to add the movies in your media folder.')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Go to Settings' }).getAttribute('href')).toBe('/settings');
	});

	it('tells a user with an empty library that an admin can scan', async () => {
		startFakeApi({ signedIn: true, role: 'user' });

		openApp('/movies');

		expect(await screen.findByText('An admin can scan the library to add movies.')).toBeTruthy();
		expect(screen.queryByRole('link', { name: 'Go to Settings' })).toBeNull();
	});

	it('keeps the filters usable when the library is empty', async () => {
		startFakeApi({ signedIn: true });
		const user = userEvent.setup();

		openApp('/movies');
		await screen.findByRole('heading', { name: 'No movies yet' });
		const panel = await openFilters(user);

		expect(await within(panel).findByText('No genres yet.')).toBeTruthy();
		expect(within(panel).queryByText('Year')).toBeNull();
	});

	it('says when nothing matches, and clears the filters', async () => {
		startFakeApi({ signedIn: true, movies: library });
		const user = userEvent.setup();

		openApp('/movies?genre=Western');

		await screen.findByRole('heading', { name: 'No movies match' });
		await user.click(screen.getByRole('button', { name: 'Clear filters' }));

		expect(await shownTitles()).toHaveLength(4);
		expect(window.location.search).toBe('');
	});
});

describe('Play on a card', () => {
	it('opens the player for a ready title', async () => {
		startFakeApi({ signedIn: true, movies: library });
		const user = userEvent.setup();

		openApp('/movies');
		await user.click(await screen.findByRole('button', { name: 'Play Alien' }));

		await waitFor(() => expect(currentPath()).toBe('/watch/1'));
	});

	it('prepares a title that is not ready, and shows it being prepared', async () => {
		startFakeApi({ signedIn: true, movies: library });
		const user = userEvent.setup();

		openApp('/movies');
		await user.click(await screen.findByRole('button', { name: 'Play Heat' }));

		expect(await screen.findByText('Preparing Heat for playback. You will be told when it is ready.')).toBeTruthy();
		expect(await screen.findByRole('button', { name: 'Preparing Heat' })).toBeTruthy();
		expect(currentPath()).toBe('/movies');
	});

	it.each(['in progress', 'not ready'] as const)(
		'says preparation is under way when the API answers %s',
		async (answer) => {
			startFakeApi({ signedIn: true, movies: [{ ...library[1]!, playAnswer: answer }] });
			const user = userEvent.setup();

			openApp('/movies');
			await user.click(await screen.findByRole('button', { name: 'Play Heat' }));

			expect(await screen.findByText('Preparing Heat for playback. You will be told when it is ready.')).toBeTruthy();
			expect(currentPath()).toBe('/movies');
		},
	);

	it('says why a failed title failed, and retries it', async () => {
		const api = startFakeApi({ signedIn: true, movies: library });
		const user = userEvent.setup();

		openApp('/movies');
		await user.click(await screen.findByRole('button', { name: 'Play Solaris' }));

		const toast = await findToast('Playback preparation for Solaris failed.');
		expect(toast.getByText('The video has no audio track.')).toBeTruthy();
		await user.click(toast.getByRole('button', { name: 'Retry' }));

		expect(await screen.findByText('Preparing Solaris again. You will be told when it is ready.')).toBeTruthy();
		expect(await screen.findByRole('button', { name: 'Preparing Solaris' })).toBeTruthy();
		expect(api.movies[3]?.status).toBe('in progress');
	});
});

describe('notifications', () => {
	it('show a ready title on its card, with Play in the toast', async () => {
		const api = startFakeApi({ signedIn: true, movies: library });
		const user = userEvent.setup();

		openApp('/movies');
		await screen.findByRole('button', { name: 'Preparing Ronin' });
		api.movies[2]!.status = 'ready';
		act(() => fakeSocket.receive('notification', { type: 'transcode:ready', data: { id: 3, title: 'Ronin' } }));

		const toast = await findToast('Playback for Ronin is ready!');
		expect(await screen.findByRole('button', { name: 'Play Ronin' })).toBeTruthy();

		await user.click(toast.getByRole('button', { name: 'Play' }));

		await waitFor(() => expect(currentPath()).toBe('/watch/3'));
	});

	it('show a failed title on its card, with the reason and Retry in the toast', async () => {
		const api = startFakeApi({ signedIn: true, movies: library });
		const user = userEvent.setup();

		openApp('/movies');
		await screen.findByRole('button', { name: 'Preparing Ronin' });
		Object.assign(api.movies[2]!, { status: 'failed', failureReason: 'Invalid data found' });
		act(() =>
			fakeSocket.receive('notification', {
				type: 'transcode:failed',
				data: { id: 3, title: 'Ronin', error: 'Invalid data found' },
			}),
		);

		const toast = await findToast('Playback preparation for Ronin failed.');
		expect(toast.getByText('Invalid data found')).toBeTruthy();
		expect(await screen.findByRole('button', { name: 'Play Ronin' })).toBeTruthy();

		await user.click(toast.getByRole('button', { name: 'Retry' }));

		expect(await screen.findByRole('button', { name: 'Preparing Ronin' })).toBeTruthy();
	});
});
