import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BackLink, PageContainer, PageHeader } from '@workspace/ui/patterns/page';

describe('PageHeader', () => {
	it('names the page, with its description, actions and a way back', () => {
		render(
			<PageContainer>
				<PageHeader
					title="Settings"
					description="Your account and the library."
					back={{ href: '/movies', label: 'Back to Movies' }}
					actions={<button type="button">Log out</button>}
				/>
			</PageContainer>,
		);

		expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeTruthy();
		expect(screen.getByText('Your account and the library.')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Back to Movies' }).getAttribute('href')).toBe('/movies');
		expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy();
	});
});

describe('BackLink', () => {
	it('is a link to the page above, named by its label alone, and reached by keyboard', async () => {
		const user = userEvent.setup();
		render(
			<PageContainer>
				<BackLink href="/movies" label="Movies" />
			</PageContainer>,
		);

		await user.tab();

		const link = screen.getByRole('link', { name: 'Movies' });
		expect(link.getAttribute('href')).toBe('/movies');
		expect(document.activeElement).toBe(link);
	});
});
