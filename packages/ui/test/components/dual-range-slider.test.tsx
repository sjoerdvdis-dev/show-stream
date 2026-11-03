import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { DualRangeSlider } from '@workspace/ui/components/dual-range-slider';

function Runtime() {
	const [value, setValue] = useState([60, 120]);
	return (
		<DualRangeSlider
			aria-label="Runtime"
			min={0}
			max={180}
			step={10}
			value={value}
			onValueChange={(next) => setValue(next as number[])}
			label={(minutes) => `${minutes} min`}
		/>
	);
}

describe('dual range slider', () => {
	it('labels each thumb with its value', async () => {
		render(<Runtime />);

		expect(await screen.findAllByRole('slider')).toHaveLength(2);
		expect(screen.getByText('60 min')).toBeTruthy();
		expect(screen.getByText('120 min')).toBeTruthy();
	});

	it('moves each end on its own with the arrow keys', async () => {
		const user = userEvent.setup();
		render(<Runtime />);
		const [start, end] = await screen.findAllByRole('slider');

		await user.tab();
		expect(document.activeElement).toBe(start);
		await user.keyboard('{ArrowRight}');
		await waitFor(() => expect(screen.getByText('70 min')).toBeTruthy());

		await user.tab();
		expect(document.activeElement).toBe(end);
		await user.keyboard('{ArrowLeft}{ArrowLeft}');
		await waitFor(() => expect(screen.getByText('100 min')).toBeTruthy());

		expect(start?.getAttribute('aria-valuenow')).toBe('70');
		expect(end?.getAttribute('aria-valuenow')).toBe('100');
	});

	it('keeps the start from passing the end', async () => {
		const user = userEvent.setup();
		render(<Runtime />);
		const [start] = await screen.findAllByRole('slider');

		await user.tab();
		await user.keyboard('{End}');

		expect(Number(start?.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(120);
	});
});
