import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Film, Settings, Tv } from 'lucide-react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppShell, type NavItem } from '@workspace/ui/patterns/app-shell';

const items: NavItem[] = [
	{ href: '/movies', label: 'Movies', icon: Film, active: true },
	{ href: '/shows', label: 'Shows', icon: Tv },
	{ href: '/settings', label: 'Settings', icon: Settings },
];

const renderShell = () =>
	render(
		<AppShell items={items} brand={<span>ShowStream</span>} footer={<button type="button">Log out</button>}>
			<h1>Movies</h1>
		</AppShell>,
	);

const desktopWidth = window.innerWidth;
afterEach(() => {
	window.innerWidth = desktopWidth;
});

describe('AppShell', () => {
	it('shows a collapsible sidebar on a wide screen, with the active item marked', async () => {
		const user = userEvent.setup();
		renderShell();

		const nav = screen.getByRole('navigation', { name: 'Main' });
		const links = within(nav).getAllByRole('link');
		expect(links.map((link) => link.getAttribute('href'))).toEqual(['/movies', '/shows', '/settings']);
		expect(within(nav).getByRole('link', { name: 'Movies' }).getAttribute('aria-current')).toBe('page');
		expect(within(nav).getByRole('link', { name: 'Shows' }).hasAttribute('aria-current')).toBe(false);

		await user.tab();
		expect(document.activeElement?.textContent).toBe('Toggle Sidebar');
		expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
		expect(screen.getByText('ShowStream')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy();
		expect(within(screen.getByRole('main')).getByRole('heading', { name: 'Movies' })).toBeTruthy();
	});

	it('shows a bottom bar on a phone, with the active item marked and the footer under More', async () => {
		window.innerWidth = 390;
		const user = userEvent.setup();
		renderShell();

		const nav = screen.getByRole('navigation', { name: 'Main' });
		expect(
			within(nav)
				.getAllByRole('link')
				.map((link) => link.getAttribute('href')),
		).toEqual(['/movies', '/shows', '/settings']);
		expect(within(nav).getByRole('link', { name: 'Movies' }).getAttribute('aria-current')).toBe('page');
		expect(within(nav).getByRole('link', { name: 'Settings' }).hasAttribute('aria-current')).toBe(false);
		expect(screen.queryByRole('button', { name: 'Toggle Sidebar' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'Log out' })).toBeNull();
		expect(within(screen.getByRole('main')).getByRole('heading', { name: 'Movies' })).toBeTruthy();

		const more = within(nav).getByRole('button', { name: 'More' });
		more.focus();
		await user.keyboard('{Enter}');
		const sheet = await screen.findByRole('dialog', { name: 'More' });
		expect(within(sheet).getByText('ShowStream')).toBeTruthy();
		expect(within(sheet).getByRole('button', { name: 'Log out' })).toBeTruthy();

		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(document.activeElement).toBe(more);
	});
});
