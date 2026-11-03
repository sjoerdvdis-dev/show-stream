import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from '@workspace/ui/components/checkbox';
import { Label } from '@workspace/ui/components/label';

describe('checkbox', () => {
	it('toggles with Space, named by its label', async () => {
		const user = userEvent.setup();
		const onCheckedChange = vi.fn();
		render(
			<Label>
				<Checkbox onCheckedChange={onCheckedChange} />
				Include unmatched files
			</Label>,
		);
		const checkbox = screen.getByRole('checkbox', { name: 'Include unmatched files' });

		await user.tab();
		expect(document.activeElement).toBe(checkbox);

		await user.keyboard(' ');
		expect(checkbox.getAttribute('aria-checked')).toBe('true');
		await user.keyboard(' ');
		expect(checkbox.getAttribute('aria-checked')).toBe('false');

		expect(onCheckedChange.mock.calls.map(([checked]) => checked)).toEqual([true, false]);
	});

	it('toggles by clicking its label', async () => {
		const user = userEvent.setup();
		render(
			<Label>
				<Checkbox />
				Include unmatched files
			</Label>,
		);

		await user.click(screen.getByText('Include unmatched files'));

		expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
	});
});
