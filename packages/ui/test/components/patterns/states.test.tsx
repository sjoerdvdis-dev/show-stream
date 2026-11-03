import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState, ErrorState, LoadingGrid } from '@workspace/ui/patterns/states';

describe('EmptyState', () => {
	it('shows its title, description and action', () => {
		render(
			<EmptyState title="No movies yet" description="Scan the library to fill it." action={<button>Scan</button>} />,
		);

		expect(screen.getByRole('heading', { name: 'No movies yet' })).toBeTruthy();
		expect(screen.getByText('Scan the library to fill it.')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Scan' })).toBeTruthy();
	});
});

describe('ErrorState', () => {
	it('announces the error, and retries by keyboard', async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();
		render(<ErrorState title="Could not load the library" description="The server did not answer." onRetry={onRetry} />);

		expect(screen.getByRole('alert').textContent).toContain('Could not load the library');
		await user.tab();
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Try again' }));
		await user.keyboard('{Enter}');
		expect(onRetry).toHaveBeenCalledOnce();
	});

	it('has no retry button without onRetry', () => {
		render(<ErrorState title="Could not load the library" />);

		expect(screen.queryByRole('button')).toBeNull();
	});
});

describe('LoadingGrid', () => {
	it('tells assistive technology that it is loading', () => {
		render(<LoadingGrid label="Loading movies" />);

		const status = screen.getByRole('status', { name: 'Loading movies' });
		expect(status.getAttribute('aria-busy')).toBe('true');
	});
});
