import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FilterBar } from '@workspace/ui/patterns/filter-bar';
import { FacetFilter } from '@workspace/ui/patterns/filters';

type Sort = 'title' | 'release' | 'runtime';
const sorts: { value: Sort; label: string }[] = [
	{ value: 'title', label: 'Title' },
	{ value: 'release', label: 'Release date' },
	{ value: 'runtime', label: 'Runtime' },
];

const genres = [
	{ value: 'action', label: 'Action', count: 12 },
	{ value: 'drama', label: 'Drama', count: 30 },
];

type Changes = {
	onSearchChange?: (search: string) => void;
	onSortChange?: (sort: Sort) => void;
	onGenresChange?: (genres: string[]) => void;
};

// A screen that keeps the bar's values, as a list route would in its URL.
const Movies = ({ onSearchChange = () => {}, onSortChange = () => {}, onGenresChange = () => {} }: Changes) => {
	const [search, setSearch] = useState('');
	const [sort, setSort] = useState<Sort>('title');
	const [selectedGenres, setSelectedGenres] = useState(['drama']);
	const changeGenres = (next: string[]) => {
		setSelectedGenres(next);
		onGenresChange(next);
	};
	return (
		<FilterBar
			search={search}
			onSearchChange={(next) => {
				setSearch(next);
				onSearchChange(next);
			}}
			searchLabel="Search movies"
			sort={sort}
			sortOptions={sorts}
			onSortChange={(next) => {
				setSort(next);
				onSortChange(next);
			}}
			filters={<FacetFilter label="Genre" options={genres} selected={selectedGenres} onChange={changeGenres} />}
			activeFilterCount={selectedGenres.length}
			onClearFilters={() => changeGenres([])}
		/>
	);
};

const desktopWidth = window.innerWidth;
afterEach(() => {
	window.innerWidth = desktopWidth;
});

describe('FilterBar', () => {
	it('emits the search as the user types, and clears it', async () => {
		const user = userEvent.setup();
		const onSearchChange = vi.fn();
		render(<Movies onSearchChange={onSearchChange} />);
		const search = screen.getByRole('searchbox', { name: 'Search movies' });

		expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
		await user.type(search, 'dune');
		expect(onSearchChange).toHaveBeenLastCalledWith('dune');

		await user.click(screen.getByRole('button', { name: 'Clear search' }));
		expect(onSearchChange).toHaveBeenLastCalledWith('');
		expect((search as HTMLInputElement).value).toBe('');
		expect(document.activeElement).toBe(search);
	});

	it('emits the sort chosen by keyboard', async () => {
		const user = userEvent.setup();
		const onSortChange = vi.fn();
		render(<Movies onSortChange={onSortChange} />);
		const sort = screen.getByRole('combobox', { name: 'Sort by' });
		expect(within(sort).getByText('Title')).toBeTruthy();

		sort.focus();
		await user.keyboard('{ArrowDown}');
		await screen.findByRole('listbox');
		await user.keyboard('ru');
		await waitFor(() =>
			expect(screen.getByRole('option', { name: 'Runtime' }).hasAttribute('data-highlighted')).toBe(true),
		);
		await user.keyboard('{Enter}');

		expect(onSortChange).toHaveBeenLastCalledWith('runtime');
		await waitFor(() => expect(within(sort).getByText('Runtime')).toBeTruthy());
	});

	it('counts the active filters, and emits filter changes from its popover', async () => {
		const user = userEvent.setup();
		const onGenresChange = vi.fn();
		render(<Movies onGenresChange={onGenresChange} />);

		await user.click(screen.getByRole('button', { name: 'Filters, 1 active' }));
		const panel = await screen.findByRole('dialog', { name: 'Filters' });
		await user.click(within(panel).getByRole('checkbox', { name: /Action/ }));
		expect(onGenresChange).toHaveBeenLastCalledWith(['drama', 'action']);
		expect(screen.getByRole('button', { name: 'Filters, 2 active' })).toBeTruthy();

		await user.click(within(panel).getByRole('button', { name: 'Clear filters' }));
		expect(onGenresChange).toHaveBeenLastCalledWith([]);
		expect(screen.getByRole('button', { name: 'Filters' })).toBeTruthy();
	});

	it('folds the filters into a sheet on a phone, which opens and closes by keyboard', async () => {
		window.innerWidth = 390;
		const user = userEvent.setup();
		const onGenresChange = vi.fn();
		render(<Movies onGenresChange={onGenresChange} />);
		const trigger = screen.getByRole('button', { name: 'Filters, 1 active' });
		expect(screen.queryByRole('checkbox')).toBeNull();

		trigger.focus();
		await user.keyboard('{Enter}');
		const sheet = await screen.findByRole('dialog', { name: 'Filters' });
		// Focus moves into the sheet, to its first filter.
		await waitFor(() => expect(document.activeElement).toBe(within(sheet).getByRole('checkbox', { name: /Action/ })));
		await user.keyboard(' ');
		expect(onGenresChange).toHaveBeenLastCalledWith(['drama', 'action']);

		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Filters, 2 active' }));

		await user.keyboard('{Enter}');
		await screen.findByRole('dialog', { name: 'Filters' });
		screen.getByRole('button', { name: 'Done' }).focus();
		await user.keyboard('{Enter}');
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Filters, 2 active' }));
	});
});
