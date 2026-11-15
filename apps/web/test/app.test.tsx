import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '@/features/app/app-update';
import { startFakeApi } from './support/fake-api';
import { fakeServiceWorker } from './support/fake-service-worker';
import { currentPath, findLoginPage, findMoviesPage, openApp, returnPath } from './support/render-app';

const findUnreachable = () => screen.findByRole('heading', { name: 'Cannot reach the server' });

describe('a server that cannot be reached', () => {
	it.each(['/movies', '/login', '/settings'])('says so on %s, and Retry carries on once it answers', async (path) => {
		const api = startFakeApi({ signedIn: true, unreachable: true });
		const user = userEvent.setup();

		openApp(path);

		await findUnreachable();
		expect(screen.queryByRole('heading', { name: 'Log in to ShowStream' })).toBeNull();
		expect(currentPath()).toBe(path);

		api.unreachable = false;
		await user.click(screen.getByRole('button', { name: 'Retry' }));

		if (path === '/settings') {
			expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeTruthy();
		} else {
			await findMoviesPage();
		}
	});

	it('says so when Caddy answers for an API that is down', async () => {
		startFakeApi({ signedIn: true, gatewayDown: true });

		openApp('/movies');

		await findUnreachable();
		expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
	});

	it('keeps saying so while it stays out of reach', async () => {
		startFakeApi({ signedIn: true, unreachable: true });
		const user = userEvent.setup();

		openApp('/movies');
		await findUnreachable();
		await user.click(screen.getByRole('button', { name: 'Retry' }));

		await findUnreachable();
		expect(currentPath()).toBe('/movies');
	});

	it('still sends a 401 on the session check to login', async () => {
		startFakeApi({ signedIn: false });

		openApp('/movies');

		await findLoginPage();
		expect(returnPath()).toBe('/movies');
		expect(screen.queryByRole('heading', { name: 'Cannot reach the server' })).toBeNull();
	});
});

describe('a new version', () => {
	let reload: ReturnType<typeof vi.fn>;
	const originalLocation = window.location;

	beforeEach(() => {
		reload = vi.fn();
		// jsdom cannot reload, so the test sees whether the app asked.
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: new Proxy(
				{},
				{
					get: (_, key) => {
						if (key === 'reload') return reload;
						const value: unknown = Reflect.get(originalLocation, key);
						return typeof value === 'function' ? value.bind(originalLocation) : value;
					},
				},
			),
		});
		registerServiceWorker();
	});

	afterEach(() => {
		Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
	});

	const findUpdate = async () =>
		within(screen.getByRole('region', { name: /Notifications/ }))
			.findByText('A new version of ShowStream is ready.')
			.then((text) => text.closest('li')!);

	it('is offered with Reload, which lets it take over and then reloads', async () => {
		startFakeApi({ signedIn: true });
		const user = userEvent.setup();

		openApp('/movies');
		await findMoviesPage();
		fakeServiceWorker.waiting();

		const update = await findUpdate();
		expect(reload).not.toHaveBeenCalled();
		await user.click(within(update).getByRole('button', { name: 'Reload' }));

		expect(fakeServiceWorker.skipWaitingRequests).toBe(1);
		expect(reload).not.toHaveBeenCalled();
		fakeServiceWorker.controlling();
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('never reloads by itself, even when another tab lets it take over', async () => {
		startFakeApi({ signedIn: true });

		openApp('/movies');
		await findMoviesPage();
		fakeServiceWorker.waiting();
		await findUpdate();
		fakeServiceWorker.controlling();

		expect(reload).not.toHaveBeenCalled();
		expect(await findUpdate()).toBeTruthy();
	});

	it('reloads at once with Reload when another tab has let it take over', async () => {
		startFakeApi({ signedIn: true });
		const user = userEvent.setup();

		openApp('/movies');
		await findMoviesPage();
		fakeServiceWorker.waiting();
		fakeServiceWorker.controlling();

		await user.click(within(await findUpdate()).getByRole('button', { name: 'Reload' }));

		expect(fakeServiceWorker.skipWaitingRequests).toBe(0);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('waits on the player until the user leaves it', async () => {
		startFakeApi({ signedIn: true, movies: [{ id: 7, title: 'Demo Movie', status: 'in progress' }] });
		const user = userEvent.setup();

		openApp('/watch/7');
		await screen.findByRole('button', { name: 'Preparing Demo Movie' });
		fakeServiceWorker.waiting();
		fakeServiceWorker.controlling();

		// Long enough for the toast to have shown, had it been allowed to.
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(screen.queryByText('A new version of ShowStream is ready.')).toBeNull();
		expect(reload).not.toHaveBeenCalled();

		await user.click(within(screen.getByRole('navigation')).getByRole('link', { name: 'Movies' }));
		await findMoviesPage();

		expect(await findUpdate()).toBeTruthy();
		await waitFor(() => expect(reload).not.toHaveBeenCalled());
	});
});
