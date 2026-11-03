import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Calendar } from '@workspace/ui/components/calendar';

function ReleaseDate({ onSelect }: { onSelect: (date: Date | undefined) => void }) {
	const [date, setDate] = useState<Date | undefined>(() => new Date(2024, 0, 15));
	return (
		<Calendar
			mode="single"
			defaultMonth={new Date(2024, 0)}
			selected={date}
			onSelect={(next) => {
				setDate(next);
				onSelect(next);
			}}
		/>
	);
}

const dayButton = (name: RegExp) => screen.getByRole('button', { name });

/** Tabs past the month buttons to the grid, which takes focus on the selected day. */
const focusSelectedDay = async (user: ReturnType<typeof userEvent.setup>) => {
	for (let step = 0; step < 3; step++) {
		await user.tab();
	}
	expect(document.activeElement).toBe(dayButton(/January 15th, 2024/));
};

describe('calendar', () => {
	it('chooses a date with a click', async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(<ReleaseDate onSelect={onSelect} />);

		await user.click(dayButton(/January 20th, 2024/));

		expect(onSelect).toHaveBeenLastCalledWith(new Date(2024, 0, 20));
	});

	it('moves between days with the arrow keys and chooses with Enter', async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(<ReleaseDate onSelect={onSelect} />);

		await focusSelectedDay(user);
		await user.keyboard('{ArrowRight}');
		await waitFor(() => expect(document.activeElement).toBe(dayButton(/January 16th, 2024/)));
		await user.keyboard('{ArrowDown}');
		await waitFor(() => expect(document.activeElement).toBe(dayButton(/January 23rd, 2024/)));
		await user.keyboard('{Enter}');

		expect(onSelect).toHaveBeenLastCalledWith(new Date(2024, 0, 23));
	});

	it('moves to the next month by keyboard', async () => {
		const user = userEvent.setup();
		render(<ReleaseDate onSelect={() => {}} />);

		await focusSelectedDay(user);
		await user.keyboard('{PageDown}');

		await waitFor(() => expect(document.activeElement).toBe(dayButton(/February 15th, 2024/)));
		expect(screen.getByText('February 2024')).toBeTruthy();
	});
});
