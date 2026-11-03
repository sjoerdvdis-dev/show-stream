import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '@workspace/ui/components/button';
import { Spinner } from '@workspace/ui/components/spinner';

describe('spinner', () => {
	it('is a status named Loading on its own', () => {
		render(<Spinner />);

		expect(screen.getByRole('status', { name: 'Loading' })).toBeTruthy();
	});

	it('adds no status and leaves the name alone, hidden in a busy button', () => {
		render(
			<Button disabled aria-busy>
				<Spinner aria-hidden="true" data-icon="inline-start" />
				Log in
			</Button>,
		);

		expect(screen.getByRole('button', { name: 'Log in' }).getAttribute('aria-busy')).toBe('true');
		expect(screen.queryByRole('status')).toBeNull();
	});
});
