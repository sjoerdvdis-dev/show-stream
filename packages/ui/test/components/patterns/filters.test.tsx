import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DateRangeFilter, FacetFilter, RangeFilter, type DateRange } from '@workspace/ui/patterns/filters';

const Runtime = ({ onChange }: { onChange: (value: [number, number]) => void }) => {
	const [value, setValue] = useState<[number, number]>([60, 120]);
	return (
		<RangeFilter
			label="Runtime"
			min={0}
			max={180}
			step={10}
			value={value}
			onChange={(next) => {
				setValue(next);
				onChange(next);
			}}
			formatValue={(minutes) => `${minutes} min`}
		/>
	);
};

describe('RangeFilter', () => {
	it('shows its range, and emits a new range from the keyboard', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<Runtime onChange={onChange} />);

		expect(screen.getByText('60 min – 120 min')).toBeTruthy();
		const [start, end] = await screen.findAllByRole('slider', { name: 'Runtime' });
		await user.tab();
		expect(document.activeElement).toBe(start);
		await user.keyboard('{ArrowRight}');
		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([70, 120]));

		await user.tab();
		expect(document.activeElement).toBe(end);
		await user.keyboard('{ArrowLeft}');
		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([70, 110]));
	});
});

const ReleaseDate = ({ onChange }: { onChange: (value: DateRange) => void }) => {
	const [value, setValue] = useState<DateRange>({ from: '2024-03-01' });
	return (
		<DateRangeFilter
			label="Release date"
			value={value}
			onChange={(next) => {
				setValue(next);
				onChange(next);
			}}
		/>
	);
};

describe('DateRangeFilter', () => {
	it('emits ISO dates, and rejects an end before the start', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<ReleaseDate onChange={onChange} />);

		const group = screen.getByRole('group', { name: 'Release date' });
		const from = within(group).getByLabelText('From');
		const to = within(group).getByLabelText('To');
		expect((from as HTMLInputElement).value).toBe('2024-03-01');

		await user.type(to, '2024-02-01');
		expect(screen.getByRole('alert').textContent).toBe('The end date is before the start date.');
		expect(to.getAttribute('aria-invalid')).toBe('true');
		expect(onChange).not.toHaveBeenCalled();

		await user.clear(to);
		await user.type(to, '2024-04-30');
		expect(screen.queryByRole('alert')).toBeNull();
		expect(onChange).toHaveBeenLastCalledWith({ from: '2024-03-01', to: '2024-04-30' });

		await user.clear(from);
		expect(onChange).toHaveBeenLastCalledWith({ to: '2024-04-30' });
	});
});

const genres = [
	{ value: 'action', label: 'Action', count: 12 },
	{ value: 'drama', label: 'Drama', count: 30 },
	{ value: 'horror', label: 'Horror' },
];

describe('FacetFilter', () => {
	it('shows each option with its count, and emits the selection from the keyboard', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<FacetFilter label="Genre" options={genres} selected={['drama']} onChange={onChange} />);

		const group = screen.getByRole('group', { name: 'Genre' });
		const action = within(group).getByRole('checkbox', { name: /Action/ });
		expect(within(group).getByText('12')).toBeTruthy();
		expect(within(group).getByRole('checkbox', { name: /Drama/ }).getAttribute('aria-checked')).toBe('true');

		await user.tab();
		expect(document.activeElement).toBe(action);
		await user.keyboard(' ');
		expect(onChange).toHaveBeenLastCalledWith(['drama', 'action']);

		await user.tab();
		await user.keyboard(' ');
		expect(onChange).toHaveBeenLastCalledWith([]);
	});

	it('says it is loading while its options load', () => {
		render(<FacetFilter label="Genre" options={[]} selected={[]} onChange={() => {}} loading />);

		const group = screen.getByRole('group', { name: 'Genre' });
		expect(within(group).getByRole('status', { name: 'Loading Genre' }).getAttribute('aria-busy')).toBe('true');
		expect(within(group).queryByRole('checkbox')).toBeNull();
	});

	it('says when there is nothing to choose', () => {
		render(<FacetFilter label="Genre" options={[]} selected={[]} onChange={() => {}} />);

		expect(within(screen.getByRole('group', { name: 'Genre' })).getByText('No options yet.')).toBeTruthy();
	});

	it('announces an error, and retries by keyboard', async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();
		render(
			<FacetFilter
				label="Genre"
				options={[]}
				selected={[]}
				onChange={() => {}}
				error="Could not load the genres."
				onRetry={onRetry}
			/>,
		);

		expect(screen.getByRole('alert').textContent).toContain('Could not load the genres.');
		await user.tab();
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Try again' }));
		await user.keyboard('{Enter}');
		expect(onRetry).toHaveBeenCalledOnce();
	});
});
