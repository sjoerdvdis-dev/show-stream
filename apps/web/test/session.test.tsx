import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { startFakeApi } from './support/fake-api';
import { fakeSocket } from './support/fake-socket';
import { currentPath, findLoginPage, findMoviesPage, logIn, openApp, returnPath } from './support/render-app';

describe('a 401 from a data call', () => {
	it('returns to login with the return path, and keeps nothing', async () => {
		const api = startFakeApi({ signedIn: true, movies: [{ id: 1, title: 'First Movie' }] });
		const user = userEvent.setup();

		// The library is cached once it has loaded, so leaving it and coming back would show it again.
		openApp('/movies');
		await user.click(await screen.findByRole('link', { name: 'First Movie' }));
		await screen.findByRole('link', { name: 'Back to Movies' });

		// The session ends, and going back asks for the library again.
		api.signedIn = false;
		api.movies = [{ id: 2, title: 'Second Movie' }];
		await user.click(screen.getByRole('link', { name: 'Back to Movies' }));

		await findLoginPage();
		expect(currentPath()).toBe('/login');
		expect(returnPath()).toBe('/movies');

		api.moviesDelayMs = 200;
		await logIn();

		await findMoviesPage();
		expect(screen.queryByRole('link', { name: 'First Movie' })).toBeNull();
		expect(await screen.findByRole('link', { name: 'Second Movie' })).toBeTruthy();
	});

	it('does not count as a lost session on the login form', async () => {
		startFakeApi();

		openApp('/login');
		await logIn('wrong');

		await screen.findByRole('alert');
		expect(returnPath()).toBeNull();
	});

	it('closes the socket', async () => {
		const api = startFakeApi({ signedIn: true, movies: [{ id: 1, title: 'First Movie' }] });
		const user = userEvent.setup();

		openApp('/movies');
		await user.click(await screen.findByRole('link', { name: 'First Movie' }));
		await screen.findByRole('link', { name: 'Back to Movies' });
		expect(fakeSocket.isOpen).toBe(true);

		api.signedIn = false;
		await user.click(screen.getByRole('link', { name: 'Back to Movies' }));

		await findLoginPage();
		expect(fakeSocket.isOpen).toBe(false);
	});
});

describe('logging out', () => {
	it('ends the session, keeps nothing and closes the socket', async () => {
		const api = startFakeApi({ signedIn: true, movies: [{ id: 1, title: 'First Movie' }] });
		const user = userEvent.setup();

		openApp('/movies');
		await screen.findByRole('link', { name: 'First Movie' });
		expect(fakeSocket.isOpen).toBe(true);

		await user.click(screen.getByRole('button', { name: 'Log out' }));

		await findLoginPage();
		expect(api.signedIn).toBe(false);
		expect(returnPath()).toBeNull();
		expect(fakeSocket.isOpen).toBe(false);

		// The next user sees none of it, not even while their own library loads.
		api.movies = [{ id: 2, title: 'Second Movie' }];
		api.moviesDelayMs = 200;
		await logIn();

		await findMoviesPage();
		expect(screen.queryByRole('link', { name: 'First Movie' })).toBeNull();
		expect(await screen.findByRole('link', { name: 'Second Movie' })).toBeTruthy();
	});
});

describe('the notification socket', () => {
	it('opens only once there is a session', async () => {
		startFakeApi();

		openApp('/login');
		await findLoginPage();
		expect(fakeSocket.opened).toBe(0);

		await logIn();

		await findMoviesPage();
		await waitFor(() => expect(fakeSocket.isOpen).toBe(true));
	});

	it('shows a finished title as a toast', async () => {
		startFakeApi({ signedIn: true });

		openApp('/movies');
		await findMoviesPage();
		fakeSocket.receive('notification', { type: 'transcode:ready', data: { title: 'Demo Movie' } });

		expect(await screen.findByText('Playback for Demo Movie is ready!')).toBeTruthy();
	});

	it('shows a failed title and its reason as a toast', async () => {
		startFakeApi({ signedIn: true });

		openApp('/movies');
		await findMoviesPage();
		fakeSocket.receive('notification', {
			type: 'transcode:failed',
			data: { title: 'Corrupt Movie', error: 'Invalid data found' },
		});

		expect(await screen.findByText('Playback preparation for Corrupt Movie failed.')).toBeTruthy();
		expect(screen.getByText('Invalid data found')).toBeTruthy();
	});

	it('ignores what the contract does not know', async () => {
		startFakeApi({ signedIn: true });

		openApp('/movies');
		await findMoviesPage();
		fakeSocket.receive('notification', { type: 'unknown' });

		expect(screen.queryByRole('status')).toBeNull();
	});
});
