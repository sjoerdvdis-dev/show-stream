import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@workspace/ui/components/button';
import { ConfirmDialog, SettingsSection } from '@workspace/ui/patterns/settings';

const renderConfirm = (onConfirm: () => void | Promise<void>) =>
	render(
		<ConfirmDialog
			trigger={<Button variant="destructive">Delete user</Button>}
			title="Delete Ada?"
			description="She can no longer sign in."
			confirmLabel="Delete"
			destructive
			onConfirm={onConfirm}
		/>,
	);

describe('ConfirmDialog', () => {
	it('opens from its trigger by keyboard, and confirms by keyboard', async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		renderConfirm(onConfirm);
		const trigger = screen.getByRole('button', { name: 'Delete user' });

		await user.tab();
		expect(document.activeElement).toBe(trigger);
		await user.keyboard('{Enter}');
		const dialog = await screen.findByRole('alertdialog', { name: 'Delete Ada?' });
		expect(within(dialog).getByText('She can no longer sign in.')).toBeTruthy();

		const confirm = within(dialog).getByRole('button', { name: 'Delete' });
		while (document.activeElement !== confirm) {
			await user.tab();
		}
		await user.keyboard('{Enter}');

		expect(onConfirm).toHaveBeenCalledOnce();
		await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
		expect(document.activeElement).toBe(trigger);
	});

	it('cancels by keyboard from its cancel button or Escape, without confirming', async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		renderConfirm(onConfirm);
		const trigger = screen.getByRole('button', { name: 'Delete user' });

		trigger.focus();
		await user.keyboard('{Enter}');
		const dialog = await screen.findByRole('alertdialog');
		const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
		while (document.activeElement !== cancel) {
			await user.tab();
		}
		await user.keyboard('{Enter}');
		await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
		expect(document.activeElement).toBe(trigger);

		await user.keyboard('{Enter}');
		await screen.findByRole('alertdialog');
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('shows that it is busy while the confirmed action runs, and closes when it is done', async () => {
		const user = userEvent.setup();
		let finish = () => {};
		const onConfirm = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finish = resolve;
				}),
		);
		renderConfirm(onConfirm);

		await user.click(screen.getByRole('button', { name: 'Delete user' }));
		const dialog = await screen.findByRole('alertdialog');
		await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

		// The button keeps focus while it is disabled, so it says so with aria-disabled.
		const confirm = within(dialog).getByRole('button', { name: 'Delete' });
		expect(confirm.getAttribute('aria-disabled')).toBe('true');
		expect(confirm.getAttribute('aria-busy')).toBe('true');
		expect(document.activeElement).toBe(confirm);
		await user.keyboard('{Enter}');
		await user.keyboard('{Escape}');
		expect(screen.getByRole('alertdialog')).toBeTruthy();

		finish();
		await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
		expect(onConfirm).toHaveBeenCalledOnce();
	});

	it('stays open to try again when the confirmed action fails', async () => {
		const user = userEvent.setup();
		renderConfirm(() => Promise.reject(new Error('The server did not answer.')));

		await user.click(screen.getByRole('button', { name: 'Delete user' }));
		const dialog = await screen.findByRole('alertdialog');
		const confirm = within(dialog).getByRole('button', { name: 'Delete' });
		await user.click(confirm);

		await waitFor(() => expect(confirm.getAttribute('aria-disabled')).not.toBe('true'));
		expect(screen.getByRole('alertdialog')).toBeTruthy();
	});

	it('passes its className to the dialog', async () => {
		const user = userEvent.setup();
		render(
			<ConfirmDialog
				trigger={<Button>Reset</Button>}
				title="Reset the settings?"
				className="sm:max-w-md"
				onConfirm={() => {}}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'Reset' }));

		const dialog = await screen.findByRole('alertdialog', { name: 'Reset the settings?' });
		expect(dialog.classList.contains('sm:max-w-md')).toBe(true);
	});
});

describe('SettingsSection', () => {
	it('is a region named by its title, with its description and content', () => {
		render(
			<SettingsSection title="Playback" description="How videos start and what quality they use.">
				<label>
					<input type="checkbox" /> Autoplay the next episode
				</label>
			</SettingsSection>,
		);

		const section = screen.getByRole('region', { name: 'Playback' });
		expect(within(section).getByRole('heading', { name: 'Playback' })).toBeTruthy();
		expect(within(section).getByText('How videos start and what quality they use.')).toBeTruthy();
		expect(within(section).getByRole('checkbox', { name: 'Autoplay the next episode' })).toBeTruthy();
	});
});
