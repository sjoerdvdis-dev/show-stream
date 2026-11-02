import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server, startFakeApi } from './support/fake-api';
import {
	currentPath,
	findLoginPage,
	findMoviesPage,
	findSetupPage,
	logIn,
	openApp,
	returnPath,
} from './support/render-app';

describe('first-run setup', () => {
	it('sends login to setup while setup is needed', async () => {
		startFakeApi({ setupNeeded: true });

		openApp('/login');

		await findSetupPage();
		expect(currentPath()).toBe('/setup');
	});

	it('sends setup to login once an owner exists', async () => {
		startFakeApi({ setupNeeded: false });

		openApp('/setup');

		await findLoginPage();
		expect(currentPath()).toBe('/login');
	});

	it('sends a protected page on a new install through login to setup', async () => {
		startFakeApi({ setupNeeded: true });

		openApp('/movies');

		await findSetupPage();
	});

	it('creates the owner and opens the library', async () => {
		startFakeApi({ setupNeeded: true, movies: [{ id: 1, title: 'Demo Movie' }] });
		const user = userEvent.setup();

		openApp('/setup');
		await user.type(await screen.findByLabelText('Username'), 'owner');
		await user.type(screen.getByLabelText('Password'), 'correct horse battery');
		await user.click(screen.getByRole('button', { name: 'Create account' }));

		await findMoviesPage();
		expect(await screen.findByRole('link', { name: 'Demo Movie' })).toBeTruthy();
	});
});

describe('a protected page', () => {
	it('goes to login with no session, and returns after login', async () => {
		startFakeApi({ movies: [{ id: 7, title: 'Demo Movie' }] });

		openApp('/watch/7');

		await findLoginPage();
		expect(returnPath()).toBe('/watch/7');

		await logIn();

		await screen.findByRole('link', { name: 'Back to Movies' });
		expect(currentPath()).toBe('/watch/7');
	});

	it('keeps the query string of the page it returns to', async () => {
		startFakeApi();

		openApp('/movies?page=2');

		await findLoginPage();
		expect(returnPath()).toBe('/movies?page=2');
		await logIn();

		await findMoviesPage();
		expect(window.location.search).toBe('?page=2');
	});

	it('stays signed in across a reload', async () => {
		startFakeApi({ signedIn: true });

		openApp('/movies').unmount();
		openApp('/movies');

		await findMoviesPage();
		expect(currentPath()).toBe('/movies');
	});

	it('shows that the server cannot be reached', async () => {
		startFakeApi();
		server.use(http.get('/api/auth/me', () => HttpResponse.error()));

		openApp('/movies');

		expect((await screen.findByRole('alert')).textContent).toBe('Could not reach the server.');
	});
});

describe('the home page', () => {
	it('goes to the library', async () => {
		startFakeApi({ signedIn: true });

		openApp('/');

		await findMoviesPage();
		expect(currentPath()).toBe('/movies');
	});
});

describe('login with a session', () => {
	it('leaves for the library', async () => {
		startFakeApi({ signedIn: true });

		openApp('/login');

		await findMoviesPage();
	});
});

describe('a redirect value that leaves the app', () => {
	it.each([
		['another site', 'https://evil.example/'],
		['a network path', '//evil.example/'],
		['a backslash', '/\\evil.example/'],
		['a hidden tab', '/\t/evil.example/'],
		['a script', 'javascript:alert(1)'],
		['an API route', '/api/auth/logout'],
		['a stream', '/streams/1/playlist.m3u8'],
		['the login page', '/login'],
	])('is ignored for %s', async (_name, redirect) => {
		startFakeApi();

		openApp(`/login?redirect=${encodeURIComponent(redirect)}`);
		await findLoginPage();
		await logIn();

		await findMoviesPage();
		await waitFor(() => expect(window.location.origin + currentPath()).toBe('http://localhost:5173/movies'));
	});
});
