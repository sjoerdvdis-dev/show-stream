import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@workspace/ui/components/tooltip';
import { PlayButton, StatusBadge } from '@workspace/ui/patterns/status';

describe('StatusBadge', () => {
	it.each([
		['not ready', 'Not ready'],
		['in progress', 'Preparing'],
		['ready', 'Ready'],
		['failed', 'Failed'],
	] as const)('names the %s status', (status, label) => {
		render(<StatusBadge status={status} />);

		expect(screen.getByText(label)).toBeTruthy();
	});

	it('treats a title with no status as not ready', () => {
		render(<StatusBadge status={undefined} />);

		expect(screen.getByText('Not ready')).toBeTruthy();
	});

	it('gives the reason for a failure to assistive technology', () => {
		render(<StatusBadge status="failed" failureReason="The video has no audio track." />);

		expect(screen.getByText('The video has no audio track.')).toBeTruthy();
	});

	it('shows what the status means in a tooltip on hover', async () => {
		const user = userEvent.setup();
		render(
			<TooltipProvider delay={0}>
				<StatusBadge status="in progress" />
			</TooltipProvider>,
		);
		// Assistive technology reads the meaning with the badge, so the tooltip adds a second copy.
		expect(screen.getAllByText('Being prepared for playback.')).toHaveLength(1);

		await user.hover(screen.getByText('Preparing'));

		await waitFor(() => expect(screen.getAllByText('Being prepared for playback.')).toHaveLength(2));
	});
});

describe('PlayButton', () => {
	it.each(['ready', 'not ready', undefined] as const)('plays a %s title by keyboard', async (status) => {
		const user = userEvent.setup();
		const onPlay = vi.fn();
		render(<PlayButton title="Heat" status={status} onPlay={onPlay} />);

		await user.tab();
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Play Heat' }));
		await user.keyboard('{Enter}');
		expect(onPlay).toHaveBeenCalledOnce();
	});

	it('cannot be pressed while the title is being prepared', async () => {
		const user = userEvent.setup();
		const onPlay = vi.fn();
		render(<PlayButton title="Heat" status="in progress" onPlay={onPlay} />);

		const button = screen.getByRole('button', { name: 'Preparing Heat' });
		await user.click(button);
		expect(onPlay).not.toHaveBeenCalled();
	});

	it('retries a failed title', async () => {
		const user = userEvent.setup();
		const onPlay = vi.fn();
		const onRetry = vi.fn();
		render(<PlayButton title="Heat" status="failed" onPlay={onPlay} onRetry={onRetry} />);

		await user.click(screen.getByRole('button', { name: 'Retry Heat' }));
		expect(onRetry).toHaveBeenCalledOnce();
		expect(onPlay).not.toHaveBeenCalled();
	});

	it('plays a failed title when the screen offers no retry', async () => {
		const user = userEvent.setup();
		const onPlay = vi.fn();
		render(<PlayButton title="Heat" status="failed" onPlay={onPlay} />);

		await user.click(screen.getByRole('button', { name: 'Play Heat' }));
		expect(onPlay).toHaveBeenCalledOnce();
	});

	it('can be disabled', async () => {
		const user = userEvent.setup();
		const onPlay = vi.fn();
		render(<PlayButton title="Heat" status="ready" onPlay={onPlay} disabled />);

		await user.click(screen.getByRole('button', { name: 'Play Heat' }));
		expect(onPlay).not.toHaveBeenCalled();
	});
});
