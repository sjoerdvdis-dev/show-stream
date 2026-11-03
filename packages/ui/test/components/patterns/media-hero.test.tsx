import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MediaHero } from '@workspace/ui/patterns/media-hero';
import { PlayButton } from '@workspace/ui/patterns/status';

describe('MediaHero', () => {
	it('shows the title as the page heading, with its details and actions', () => {
		render(
			<MediaHero
				title="Heat"
				tagline="A Los Angeles crime saga"
				meta={['1995', '2h 50m', 'Crime']}
				overview="A group of professional bank robbers."
				backdrop={null}
				poster={null}
				status="ready"
				actions={<PlayButton title="Heat" status="ready" onPlay={() => {}} />}
			/>,
		);

		expect(screen.getByRole('heading', { level: 1, name: 'Heat' })).toBeTruthy();
		expect(screen.getByText('A Los Angeles crime saga')).toBeTruthy();
		expect(within(screen.getByRole('list', { name: 'Details' })).getAllByRole('listitem')).toHaveLength(3);
		expect(screen.getByText('A group of professional bank robbers.')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Play Heat' })).toBeTruthy();
	});

	it('shows the reason for a failure', () => {
		render(
			<MediaHero
				title="Heat"
				backdrop={null}
				poster={null}
				status="failed"
				failureReason="The video has no audio track."
			/>,
		);

		expect(screen.getByRole('alert').textContent).toContain('The video has no audio track.');
	});

	it('keeps its layout while loading', () => {
		render(<MediaHero loading />);

		expect(screen.getByRole('status', { name: 'Loading title' })).toBeTruthy();
		expect(screen.queryByRole('heading')).toBeNull();
	});

	it('shows the error state, and retries', async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();
		render(<MediaHero error={{ title: 'Could not load this title', onRetry }} />);

		expect(screen.getByRole('alert').textContent).toContain('Could not load this title');
		await user.click(screen.getByRole('button', { name: 'Try again' }));
		expect(onRetry).toHaveBeenCalledOnce();
	});
});
