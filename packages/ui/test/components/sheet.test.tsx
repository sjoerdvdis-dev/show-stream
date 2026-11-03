import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from '@workspace/ui/components/button';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@workspace/ui/components/sheet';

const renderSheet = () =>
	render(
		<>
			<button type="button">Outside</button>
			<Sheet>
				<SheetTrigger render={<Button />}>Queue</SheetTrigger>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>Up next</SheetTitle>
						<SheetDescription>Three episodes left.</SheetDescription>
					</SheetHeader>
					<input aria-label="Search the queue" />
				</SheetContent>
			</Sheet>
		</>,
	);

describe('sheet', () => {
	it('opens by keyboard from its trigger', async () => {
		const user = userEvent.setup();
		renderSheet();

		await user.tab();
		await user.tab();
		await user.keyboard('{Enter}');

		const sheet = await screen.findByRole('dialog', { name: 'Up next' });
		expect(screen.getByText('Three episodes left.').id).toBe(sheet.getAttribute('aria-describedby'));
		// Everything behind it is hidden from assistive technology.
		expect(screen.queryByRole('button', { name: 'Outside' })).toBeNull();
	});

	it('keeps focus inside while it is open', async () => {
		const user = userEvent.setup();
		renderSheet();

		await user.click(screen.getByRole('button', { name: 'Queue' }));
		const sheet = await screen.findByRole('dialog');

		// Focus passes through a guard at either end, which sends it back inside.
		for (let step = 0; step < 4; step++) {
			await user.tab();
			await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true));
		}
		for (let step = 0; step < 4; step++) {
			await user.tab({ shift: true });
			await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true));
		}
	});

	it('closes on Escape and gives focus back to its trigger', async () => {
		const user = userEvent.setup();
		renderSheet();
		const trigger = screen.getByRole('button', { name: 'Queue' });

		await user.tab();
		await user.tab();
		await user.keyboard('{Enter}');
		await screen.findByRole('dialog');
		await user.keyboard('{Escape}');

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(document.activeElement).toBe(trigger);
	});
});
