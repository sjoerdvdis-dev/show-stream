import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Label } from '@workspace/ui/components/label';
import { RadioGroup, RadioGroupItem } from '@workspace/ui/components/radio-group';

const statuses = ['All', 'Ready', 'Not ready'];

const renderRadioGroup = (onValueChange: (value: unknown) => void = () => {}) =>
	render(
		<RadioGroup aria-label="Playback status" defaultValue="All" onValueChange={onValueChange}>
			{statuses.map((status) => (
				<Label key={status}>
					<RadioGroupItem value={status} />
					{status}
				</Label>
			))}
		</RadioGroup>,
	);

const checked = () => screen.getAllByRole('radio').find((radio) => radio.getAttribute('aria-checked') === 'true');

describe('radio group', () => {
	it('is one tab stop, on the chosen option', async () => {
		const user = userEvent.setup();
		renderRadioGroup();

		await user.tab();

		expect(screen.getByRole('radiogroup', { name: 'Playback status' })).toBeTruthy();
		expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'All' }));
		expect(checked()).toBe(screen.getByRole('radio', { name: 'All' }));
	});

	it('chooses with the arrow keys', async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn();
		renderRadioGroup(onValueChange);

		await user.tab();
		await user.keyboard('{ArrowDown}');
		expect(checked()).toBe(screen.getByRole('radio', { name: 'Ready' }));
		await user.keyboard('{ArrowDown}');
		expect(checked()).toBe(screen.getByRole('radio', { name: 'Not ready' }));
		await user.keyboard('{ArrowUp}');
		expect(checked()).toBe(screen.getByRole('radio', { name: 'Ready' }));

		expect(onValueChange).toHaveBeenLastCalledWith('Ready', expect.anything());
	});

	it('chooses by clicking a label', async () => {
		const user = userEvent.setup();
		renderRadioGroup();

		await user.click(screen.getByText('Not ready'));

		expect(checked()).toBe(screen.getByRole('radio', { name: 'Not ready' }));
	});
});
