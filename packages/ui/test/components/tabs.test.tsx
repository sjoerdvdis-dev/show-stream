import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';

const renderTabs = () =>
	render(
		<Tabs defaultValue="overview">
			<TabsList aria-label="Movie">
				<TabsTrigger value="overview">Overview</TabsTrigger>
				<TabsTrigger value="cast">Cast</TabsTrigger>
				<TabsTrigger value="files">Files</TabsTrigger>
			</TabsList>
			<TabsContent value="overview">The plot</TabsContent>
			<TabsContent value="cast">The actors</TabsContent>
			<TabsContent value="files">The video files</TabsContent>
		</Tabs>,
	);

describe('tabs', () => {
	it('shows the panel of the chosen tab', () => {
		renderTabs();

		expect(screen.getByRole('tab', { name: 'Overview', selected: true })).toBeTruthy();
		expect(screen.getByRole('tabpanel').textContent).toBe('The plot');
	});

	it('moves between tabs with the arrow keys, and wraps', async () => {
		const user = userEvent.setup();
		renderTabs();

		await user.tab();
		expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Overview' }));

		await user.keyboard('{ArrowRight}');
		expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Cast' }));
		await user.keyboard('{ArrowRight}');
		expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Files' }));
		await user.keyboard('{ArrowRight}');
		expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Overview' }));
		await user.keyboard('{ArrowLeft}');
		expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Files' }));
	});

	it('shows a panel once its tab is chosen with Enter', async () => {
		const user = userEvent.setup();
		renderTabs();

		await user.tab();
		await user.keyboard('{ArrowRight}{Enter}');

		expect(screen.getByRole('tab', { name: 'Cast', selected: true })).toBeTruthy();
		expect(screen.getByRole('tabpanel').textContent).toBe('The actors');
	});
});
