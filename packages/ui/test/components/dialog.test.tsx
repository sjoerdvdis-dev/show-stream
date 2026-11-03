import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from '@workspace/ui/components/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@workspace/ui/components/dialog';

const renderDialog = () =>
	render(
		<>
			<button type="button">Outside</button>
			<Dialog>
				<DialogTrigger render={<Button />}>Rename</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename the movie</DialogTitle>
						<DialogDescription>Give it a new title.</DialogDescription>
					</DialogHeader>
					<input aria-label="Title" />
					<DialogFooter>
						<DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>,
	);

describe('dialog', () => {
	it('opens by keyboard, with its title and description', async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.tab();
		await user.tab();
		await user.keyboard('{Enter}');

		const dialog = await screen.findByRole('dialog', { name: 'Rename the movie' });
		expect(screen.getByText('Give it a new title.').id).toBe(dialog.getAttribute('aria-describedby'));
		// Everything behind it is hidden from assistive technology.
		expect(screen.queryByRole('button', { name: 'Outside' })).toBeNull();
	});

	it('keeps focus inside while it is open', async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.click(screen.getByRole('button', { name: 'Rename' }));
		const dialog = await screen.findByRole('dialog');

		// Focus passes through a guard at either end, which sends it back inside.
		for (let step = 0; step < 6; step++) {
			await user.tab();
			await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
		}
		for (let step = 0; step < 6; step++) {
			await user.tab({ shift: true });
			await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
		}
	});

	it('closes on Escape and gives focus back to its trigger', async () => {
		const user = userEvent.setup();
		renderDialog();
		const trigger = screen.getByRole('button', { name: 'Rename' });

		await user.click(trigger);
		await screen.findByRole('dialog');
		await user.keyboard('{Escape}');

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(document.activeElement).toBe(trigger);
	});
});
