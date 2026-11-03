import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MediaCard, MediaGrid, MediaRow } from '@workspace/ui/patterns/media-card';

type Movie = { id: number; title: string; year: number };
const movies: Movie[] = [
	{ id: 1, title: 'Heat', year: 1995 },
	{ id: 2, title: 'Ronin', year: 1998 },
];
const renderMovie = (movie: Movie) => (
	<MediaCard href={`/movies/${movie.id}`} title={movie.title} subtitle={String(movie.year)} image={null} />
);

describe('MediaCard', () => {
	it('links to the title, named by its title', () => {
		render(<MediaCard href="/movies/1" title="Heat" subtitle="1995" image={null} status="ready" />);

		const link = screen.getByRole('link', { name: /Heat/ });
		expect(link.getAttribute('href')).toBe('/movies/1');
		expect(within(link).getByText('1995')).toBeTruthy();
		expect(screen.getByText('Ready')).toBeTruthy();
	});

	it('plays from the card by keyboard, apart from the link', async () => {
		const user = userEvent.setup();
		const onPlay = vi.fn();
		render(<MediaCard href="/movies/1" title="Heat" image={null} status="ready" onPlay={onPlay} />);

		await user.tab();
		expect(document.activeElement).toBe(screen.getByRole('link', { name: /Heat/ }));
		await user.tab();
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Play Heat' }));
		await user.keyboard('{Enter}');
		expect(onPlay).toHaveBeenCalledOnce();
	});

	it('offers Retry on a failed title when the screen does', async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();
		render(
			<MediaCard href="/movies/1" title="Heat" image={null} status="failed" onPlay={() => {}} onRetry={onRetry} />,
		);

		await user.click(screen.getByRole('button', { name: 'Retry Heat' }));
		expect(onRetry).toHaveBeenCalledOnce();
	});
});

describe('MediaGrid', () => {
	it('lists its items', () => {
		render(<MediaGrid label="Movies" items={movies} getKey={(movie) => movie.id} renderItem={renderMovie} />);

		const list = screen.getByRole('list', { name: 'Movies' });
		expect(within(list).getAllByRole('listitem')).toHaveLength(2);
	});

	it('shows placeholders while loading', () => {
		render(<MediaGrid label="Movies" items={undefined} loading getKey={() => 0} renderItem={renderMovie} />);

		expect(screen.getByRole('status', { name: 'Loading movies' })).toBeTruthy();
		expect(screen.queryByRole('list')).toBeNull();
	});

	it('shows the empty state with no items', () => {
		render(
			<MediaGrid
				label="Movies"
				items={[]}
				getKey={(movie: Movie) => movie.id}
				renderItem={renderMovie}
				empty={{ title: 'No movies yet', description: 'Scan the library to fill it.' }}
			/>,
		);

		expect(screen.getByRole('heading', { name: 'No movies yet' })).toBeTruthy();
	});

	it('shows the error state, and retries', async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();
		render(
			<MediaGrid
				label="Movies"
				items={undefined}
				getKey={(movie: Movie) => movie.id}
				renderItem={renderMovie}
				error={{ title: 'Could not load the library', onRetry }}
			/>,
		);

		expect(screen.getByRole('alert').textContent).toContain('Could not load the library');
		await user.click(screen.getByRole('button', { name: 'Try again' }));
		expect(onRetry).toHaveBeenCalledOnce();
	});
});

describe('MediaRow', () => {
	it('is a section named by its title, with its items in a list', () => {
		render(<MediaRow title="Recently added" items={movies} getKey={(movie) => movie.id} renderItem={renderMovie} />);

		const section = screen.getByRole('region', { name: 'Recently added' });
		expect(within(section).getAllByRole('listitem')).toHaveLength(2);
	});

	it('shows its loading, empty and error states', () => {
		const { rerender } = render(
			<MediaRow title="Recently added" items={undefined} loading getKey={() => 0} renderItem={renderMovie} />,
		);
		expect(screen.getByRole('status', { name: 'Loading recently added' })).toBeTruthy();

		rerender(
			<MediaRow
				title="Recently added"
				items={[]}
				getKey={(movie: Movie) => movie.id}
				renderItem={renderMovie}
				empty={{ title: 'Nothing added this week' }}
			/>,
		);
		expect(screen.getByText('Nothing added this week')).toBeTruthy();

		rerender(
			<MediaRow
				title="Recently added"
				items={undefined}
				getKey={(movie: Movie) => movie.id}
				renderItem={renderMovie}
				error={{ title: 'Could not load this row' }}
			/>,
		);
		expect(screen.getByRole('alert').textContent).toContain('Could not load this row');
	});
});
