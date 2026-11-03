import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { startFakeApi, type FakeMovie } from './support/fake-api';
import { currentPath, openApp } from './support/render-app';

const heat: FakeMovie = {
	id: 949,
	title: 'Heat',
	year: 1995,
	releaseDate: '1995-12-15',
	runtime: 170,
	rating: 7.9,
	genres: ['Action', 'Crime'],
	status: 'ready',
	overview: 'A group of high-end professional thieves start to feel the heat.',
};

describe("a movie's page", () => {
	it('shows its details, and plays a ready title', async () => {
		startFakeApi({ signedIn: true, movies: [heat] });
		const user = userEvent.setup();

		openApp('/movies/949');

		expect(await screen.findByRole('heading', { level: 1, name: 'Heat' })).toBeTruthy();
		const details = within(screen.getByRole('list', { name: 'Details' }));
		expect(details.getByText('1995')).toBeTruthy();
		expect(details.getByText('2h 50m')).toBeTruthy();
		expect(details.getByText('7.9')).toBeTruthy();
		expect(details.getByText('Action, Crime')).toBeTruthy();
		expect(screen.getByText(heat.overview!)).toBeTruthy();

		await user.click(screen.getByRole('button', { name: 'Play Heat' }));

		await waitFor(() => expect(currentPath()).toBe('/watch/949'));
	});

	it('shows why a failed title failed, and offers Retry in place of Play', async () => {
		const api = startFakeApi({
			signedIn: true,
			movies: [{ ...heat, status: 'failed', failureReason: 'The video has no audio track.' }],
		});
		const user = userEvent.setup();

		openApp('/movies/949');

		expect((await screen.findByRole('alert')).textContent).toContain('The video has no audio track.');
		expect(screen.queryByRole('button', { name: 'Play Heat' })).toBeNull();

		await user.click(screen.getByRole('button', { name: 'Retry Heat' }));

		expect(await screen.findByText('Preparing Heat again. You will be told when it is ready.')).toBeTruthy();
		expect(await screen.findByRole('button', { name: 'Preparing Heat' })).toBeTruthy();
		expect(api.movies[0]?.status).toBe('in progress');
	});

	it('says so when the title is not in the library', async () => {
		startFakeApi({ signedIn: true, movies: [heat] });

		openApp('/movies/1');

		expect(await screen.findByRole('heading', { name: 'This movie is not in the library' })).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Browse movies' })).toBeTruthy();
	});

	it('offers to try again when it cannot load', async () => {
		const api = startFakeApi({ signedIn: true, movies: [heat], libraryFails: true });
		const user = userEvent.setup();

		openApp('/movies/949');

		await screen.findByRole('heading', { name: 'Could not load this movie' });
		api.libraryFails = false;
		await user.click(screen.getByRole('button', { name: 'Try again' }));

		expect(await screen.findByRole('heading', { level: 1, name: 'Heat' })).toBeTruthy();
	});

	it('shows a placeholder while it loads', async () => {
		startFakeApi({ signedIn: true, movies: [heat], moviesDelayMs: 300 });

		openApp('/movies/949');

		expect(await screen.findByRole('status', { name: 'Loading title' })).toBeTruthy();
		expect(await screen.findByRole('heading', { level: 1, name: 'Heat' })).toBeTruthy();
	});
});
