import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppLink, LinkProvider, type LinkComponent } from '@workspace/ui/patterns/link';

describe('AppLink', () => {
	it('is a plain link when the app supplies none', () => {
		render(<AppLink href="/movies">Movies</AppLink>);

		expect(screen.getByRole('link', { name: 'Movies' }).getAttribute('href')).toBe('/movies');
	});

	it('renders through the link the app supplies', () => {
		const RouterLink: LinkComponent = ({ href, children, ...props }) => (
			<a href={`/app${href}`} data-router="" {...props}>
				{children}
			</a>
		);
		render(
			<LinkProvider component={RouterLink}>
				<AppLink href="/movies" className="font-semibold">
					Movies
				</AppLink>
			</LinkProvider>,
		);

		const link = screen.getByRole('link', { name: 'Movies' });
		expect(link.getAttribute('href')).toBe('/app/movies');
		expect(link.hasAttribute('data-router')).toBe(true);
	});
});
