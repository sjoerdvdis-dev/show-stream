import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@workspace/ui/components/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';

const renderMenu = (onSelect: (item: string) => void = () => {}) =>
	render(
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="outline" />}>Options</DropdownMenuTrigger>
			<DropdownMenuContent>
				{['Play', 'Rescan', 'Remove'].map((item) => (
					<DropdownMenuItem key={item} onClick={() => onSelect(item)}>
						{item}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>,
	);

const openByKeyboard = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.tab();
	await user.keyboard('{Enter}');
	await screen.findByRole('menu');
	await waitFor(() => expect(document.activeElement).toHaveProperty('textContent', 'Play'));
};

describe('dropdown menu', () => {
	it('opens from the keyboard on the first item', async () => {
		const user = userEvent.setup();
		renderMenu();

		await openByKeyboard(user);

		expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Play', 'Rescan', 'Remove']);
	});

	it('moves between items with the arrow keys', async () => {
		const user = userEvent.setup();
		renderMenu();
		await openByKeyboard(user);

		await user.keyboard('{ArrowDown}');
		expect(document.activeElement?.textContent).toBe('Rescan');
		await user.keyboard('{ArrowDown}');
		expect(document.activeElement?.textContent).toBe('Remove');
		await user.keyboard('{ArrowUp}');
		expect(document.activeElement?.textContent).toBe('Rescan');
	});

	it('jumps to an item by typing its first letters', async () => {
		const user = userEvent.setup();
		renderMenu();
		await openByKeyboard(user);

		await user.keyboard('rem');

		await waitFor(() => expect(document.activeElement?.textContent).toBe('Remove'));
	});

	it('chooses with Enter, closes, and gives focus back', async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		renderMenu(onSelect);
		await openByKeyboard(user);

		await user.keyboard('{ArrowDown}{Enter}');

		expect(onSelect).toHaveBeenCalledWith('Rescan');
		await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Options' }));
	});

	it('closes on Escape', async () => {
		const user = userEvent.setup();
		renderMenu();
		await openByKeyboard(user);

		await user.keyboard('{Escape}');

		await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Options' }));
	});
});
