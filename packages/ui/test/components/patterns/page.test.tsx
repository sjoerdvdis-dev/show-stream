import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageContainer, PageHeader } from '@workspace/ui/patterns/page';

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
