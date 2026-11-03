import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from '@workspace/ui/components/button';
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@workspace/ui/components/drawer';

describe('drawer', () => {
	it('opens by keyboard, and closes on Escape with focus back on its trigger', async () => {
		const user = userEvent.setup();
		render(
			<Drawer>
				<DrawerTrigger render={<Button />}>Filter</DrawerTrigger>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>Filters</DrawerTitle>
						<DrawerDescription>No active filters</DrawerDescription>
					</DrawerHeader>
					<input aria-label="Genre" />
				</DrawerContent>
			</Drawer>,
		);
		const trigger = screen.getByRole('button', { name: 'Filter' });

		await user.tab();
		await user.keyboard('{Enter}');
		expect(await screen.findByRole('dialog', { name: 'Filters' })).toBeTruthy();

		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(document.activeElement).toBe(trigger);
	});
});
