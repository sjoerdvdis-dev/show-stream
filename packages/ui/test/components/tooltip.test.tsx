import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from '@workspace/ui/components/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@workspace/ui/components/tooltip';

const renderTooltip = () =>
	render(
		<TooltipProvider delay={0}>
			<button type="button">Before</button>
			<Tooltip>
				<TooltipTrigger render={<Button size="icon" aria-label="Retry" />}>R</TooltipTrigger>
				<TooltipContent>Transcoding failed. Retry</TooltipContent>
			</Tooltip>
		</TooltipProvider>,
	);

describe('tooltip', () => {
	it('opens when its trigger gets keyboard focus, and closes when focus leaves', async () => {
		const user = userEvent.setup();
		renderTooltip();

		await user.tab();
		expect(screen.queryByText('Transcoding failed. Retry')).toBeNull();
		await user.tab();
		expect(await screen.findByText('Transcoding failed. Retry')).toBeTruthy();

		await user.tab({ shift: true });
		await waitFor(() => expect(screen.queryByText('Transcoding failed. Retry')).toBeNull());
	});

	it('closes on Escape and keeps focus on its trigger', async () => {
		const user = userEvent.setup();
		renderTooltip();
		const trigger = screen.getByRole('button', { name: 'Retry' });

		await user.tab();
		await user.tab();
		await screen.findByText('Transcoding failed. Retry');
		await user.keyboard('{Escape}');

		await waitFor(() => expect(screen.queryByText('Transcoding failed. Retry')).toBeNull());
		expect(document.activeElement).toBe(trigger);
	});

	it('opens on hover, and closes when the pointer leaves', async () => {
		const user = userEvent.setup();
		renderTooltip();

		await user.hover(screen.getByRole('button', { name: 'Retry' }));
		expect(await screen.findByText('Transcoding failed. Retry')).toBeTruthy();

		await user.unhover(screen.getByRole('button', { name: 'Retry' }));
		await waitFor(() => expect(screen.queryByText('Transcoding failed. Retry')).toBeNull());
	});
});
