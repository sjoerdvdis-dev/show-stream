import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@workspace/ui/components/alert-dialog';
import { Button } from '@workspace/ui/components/button';

const renderAlertDialog = (onDelete = () => {}) =>
	render(
		<>
			<button type="button">Outside</button>
			<AlertDialog>
				<AlertDialogTrigger render={<Button variant="destructive" />}>Delete</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete the movie?</AlertDialogTitle>
						<AlertDialogDescription>The file stays on disk.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>,
	);

describe('alert dialog', () => {
	it('asks with its title and description, and hides the page behind it', async () => {
		const user = userEvent.setup();
		renderAlertDialog();

		await user.click(screen.getByRole('button', { name: 'Delete' }));

		const dialog = await screen.findByRole('alertdialog', { name: 'Delete the movie?' });
		expect(screen.getByText('The file stays on disk.').id).toBe(dialog.getAttribute('aria-describedby'));
		expect(screen.queryByRole('button', { name: 'Outside' })).toBeNull();
	});

	it('keeps focus inside while it is open', async () => {
		const user = userEvent.setup();
		renderAlertDialog();

		await user.click(screen.getByRole('button', { name: 'Delete' }));
		const dialog = await screen.findByRole('alertdialog');

		for (let step = 0; step < 4; step++) {
			await user.tab();
			await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
		}
		for (let step = 0; step < 4; step++) {
			await user.tab({ shift: true });
			await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
		}
	});

	it('closes on Escape without acting, and gives focus back', async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();
		renderAlertDialog(onDelete);
		const trigger = screen.getByRole('button', { name: 'Delete' });

		await user.click(trigger);
		await screen.findByRole('alertdialog');
		await user.keyboard('{Escape}');

		await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
		expect(document.activeElement).toBe(trigger);
		expect(onDelete).not.toHaveBeenCalled();
	});

	it('acts from the keyboard', async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();
		renderAlertDialog(onDelete);

		await user.click(screen.getByRole('button', { name: 'Delete' }));
		const dialog = await screen.findByRole('alertdialog');
		while (document.activeElement !== within(dialog).getByRole('button', { name: 'Delete' })) {
			await user.tab();
		}
		await user.keyboard('{Enter}');

		expect(onDelete).toHaveBeenCalledOnce();
	});
});
