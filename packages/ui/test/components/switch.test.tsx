import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Label } from '@workspace/ui/components/label';
import { Switch } from '@workspace/ui/components/switch';

describe('switch', () => {
	it('toggles with Space and Enter, named by its label', async () => {
		const user = userEvent.setup();
		const onCheckedChange = vi.fn();
		render(
			<Label>
				<Switch onCheckedChange={onCheckedChange} />
				Autoplay
			</Label>,
		);
		const toggle = screen.getByRole('switch', { name: 'Autoplay' });

		await user.tab();
		expect(document.activeElement).toBe(toggle);
		expect(toggle.getAttribute('aria-checked')).toBe('false');

		await user.keyboard(' ');
		expect(toggle.getAttribute('aria-checked')).toBe('true');
		await user.keyboard('{Enter}');
		expect(toggle.getAttribute('aria-checked')).toBe('false');

		expect(onCheckedChange.mock.calls.map(([checked]) => checked)).toEqual([true, false]);
	});

	it('cannot be changed while disabled', async () => {
		const user = userEvent.setup();
		render(<Switch aria-label="Autoplay" disabled />);

		await user.click(screen.getByRole('switch', { name: 'Autoplay' }));

		expect(screen.getByRole('switch', { name: 'Autoplay' }).getAttribute('aria-checked')).toBe('false');
	});
});
