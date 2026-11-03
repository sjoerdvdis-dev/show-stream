import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from '@workspace/ui/components/button';
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from '@workspace/ui/components/popover';

const renderPopover = () =>
	render(
		<>
			<Popover>
				<PopoverTrigger render={<Button variant="outline" />}>Details</PopoverTrigger>
				<PopoverContent>
					<PopoverHeader>
						<PopoverTitle>Demo Movie</PopoverTitle>
						<PopoverDescription>2024, 1 h 40 min</PopoverDescription>
					</PopoverHeader>
					<button type="button">Play</button>
				</PopoverContent>
			</Popover>
			<button type="button">Elsewhere</button>
		</>,
	);

describe('popover', () => {
	it('opens from the keyboard, named by its title', async () => {
		const user = userEvent.setup();
		renderPopover();

		await user.tab();
		await user.keyboard('{Enter}');

		expect(await screen.findByRole('dialog', { name: 'Demo Movie' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Details' }).getAttribute('aria-expanded')).toBe('true');
	});

	it('closes on Escape and gives focus back to its trigger', async () => {
		const user = userEvent.setup();
		renderPopover();
		const trigger = screen.getByRole('button', { name: 'Details' });

		await user.click(trigger);
		await screen.findByRole('dialog');
		await user.keyboard('{Escape}');

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(document.activeElement).toBe(trigger);
	});

	it('closes on a click outside', async () => {
		const user = userEvent.setup();
		renderPopover();

		await user.click(screen.getByRole('button', { name: 'Details' }));
		await screen.findByRole('dialog');
		await user.click(screen.getByRole('button', { name: 'Elsewhere' }));

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	});
});
