import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Slider } from '@workspace/ui/components/slider';

describe('slider', () => {
	it('changes by a step with the arrow keys, and jumps with Home and End', async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn();
		render(<Slider aria-label="Volume" defaultValue={[50]} min={0} max={100} step={5} onValueChange={onValueChange} />);
		const thumb = await screen.findByRole('slider');

		await user.tab();
		expect(document.activeElement).toBe(thumb);

		await user.keyboard('{ArrowRight}');
		expect(thumb.getAttribute('aria-valuenow')).toBe('55');
		await user.keyboard('{ArrowUp}');
		expect(thumb.getAttribute('aria-valuenow')).toBe('60');
		await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowDown}');
		expect(thumb.getAttribute('aria-valuenow')).toBe('45');
		await user.keyboard('{End}');
		expect(thumb.getAttribute('aria-valuenow')).toBe('100');
		await user.keyboard('{Home}');
		expect(thumb.getAttribute('aria-valuenow')).toBe('0');

		expect(onValueChange).toHaveBeenLastCalledWith([0], expect.anything());
	});
});
