import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from '@workspace/ui/components/sidebar';

const renderSidebar = () =>
	render(
		<SidebarProvider>
			<Sidebar>
				<SidebarContent>
					<nav aria-label="Library">
						<a href="/movies">Movies</a>
					</nav>
				</SidebarContent>
			</Sidebar>
			<main>
				<SidebarTrigger />
			</main>
		</SidebarProvider>,
	);

// The sidebar says whether it is expanded or collapsed in `data-state`, which its styles read.
const sidebarState = () =>
	screen.getByRole('navigation', { name: 'Library' }).closest('[data-state]')?.getAttribute('data-state');

const desktopWidth = window.innerWidth;
afterEach(() => {
	window.innerWidth = desktopWidth;
});

describe('sidebar', () => {
	it('collapses and expands from its trigger by keyboard', async () => {
		const user = userEvent.setup();
		renderSidebar();
		expect(sidebarState()).toBe('expanded');

		await user.tab();
		await user.tab();
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Toggle Sidebar' }));

		await user.keyboard('{Enter}');
		expect(sidebarState()).toBe('collapsed');
		await user.keyboard(' ');
		expect(sidebarState()).toBe('expanded');
	});

	it('collapses and expands on Ctrl+B', async () => {
		const user = userEvent.setup();
		renderSidebar();

		await user.keyboard('{Control>}b{/Control}');
		expect(sidebarState()).toBe('collapsed');
		await user.keyboard('{Control>}b{/Control}');
		expect(sidebarState()).toBe('expanded');
	});

	it('opens as a dialog at phone width, and closes on Escape with focus back on its trigger', async () => {
		window.innerWidth = 400;
		const user = userEvent.setup();
		renderSidebar();
		const trigger = screen.getByRole('button', { name: 'Toggle Sidebar' });

		await user.tab();
		expect(document.activeElement).toBe(trigger);
		await user.keyboard('{Enter}');
		expect(await screen.findByRole('dialog', { name: 'Sidebar' })).toBeTruthy();
		expect(screen.getByRole('navigation', { name: 'Library' })).toBeTruthy();

		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(document.activeElement).toBe(trigger);
	});
});
