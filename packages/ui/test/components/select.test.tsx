import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@workspace/ui/components/select';

const sorts = [
	{ label: 'Title', value: 'title' },
	{ label: 'Release date', value: 'release' },
	{ label: 'Runtime', value: 'runtime' },
];

const renderSelect = (onValueChange: (value: string | null) => void = () => {}) =>
	render(
		<Select items={sorts} defaultValue="title" onValueChange={onValueChange}>
			<SelectTrigger aria-label="Sort by">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{sorts.map((sort) => (
						<SelectItem key={sort.value} value={sort.value}>
							{sort.label}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>,
	);

const highlighted = () => screen.getAllByRole('option').find((option) => option.hasAttribute('data-highlighted'));

describe('select', () => {
	it('shows the label of its value', () => {
		renderSelect();

		expect(within(screen.getByRole('combobox', { name: 'Sort by' })).getByText('Title')).toBeTruthy();
	});

	it('opens from the keyboard and moves with the arrow keys', async () => {
		const user = userEvent.setup();
		renderSelect();

		await user.tab();
		await user.keyboard('{ArrowDown}');
		await screen.findByRole('listbox');
		await waitFor(() => expect(highlighted()?.textContent).toBe('Title'));

		await user.keyboard('{ArrowDown}');
		await waitFor(() => expect(highlighted()?.textContent).toBe('Release date'));
		await user.keyboard('{ArrowDown}');
		await waitFor(() => expect(highlighted()?.textContent).toBe('Runtime'));
		await user.keyboard('{ArrowUp}');
		await waitFor(() => expect(highlighted()?.textContent).toBe('Release date'));
	});

	it('jumps to an option by typing, and chooses it with Enter', async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn();
		renderSelect(onValueChange);

		await user.tab();
		await user.keyboard('{ArrowDown}');
		await screen.findByRole('listbox');
		await user.keyboard('ru');
		await waitFor(() => expect(highlighted()?.textContent).toBe('Runtime'));
		await user.keyboard('{Enter}');

		expect(onValueChange).toHaveBeenCalledWith('runtime', expect.anything());
		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
		expect(within(screen.getByRole('combobox', { name: 'Sort by' })).getByText('Runtime')).toBeTruthy();
	});

	it('closes on Escape without changing', async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn();
		renderSelect(onValueChange);

		await user.tab();
		await user.keyboard('{ArrowDown}');
		await screen.findByRole('listbox');
		await user.keyboard('{ArrowDown}{Escape}');

		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
		expect(onValueChange).not.toHaveBeenCalled();
		expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Sort by' }));
	});
});
