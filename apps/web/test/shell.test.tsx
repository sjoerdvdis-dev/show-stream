import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { startFakeApi } from './support/fake-api';
import { currentPath, openApp } from './support/render-app';

const desktopWidth = window.innerWidth;

afterEach(() => {
	window.innerWidth = desktopWidth;
});

const findNavigation = async () => within(await screen.findByRole('navigation', { name: 'Main' }));

describe('the app shell', () => {
	it('has Movies and Settings, and marks where the user is', async () => {
		startFakeApi({ signedIn: true, movies: [{ id: 7, title: 'Heat' }] });
		const user = userEvent.setup();

		openApp('/movies/7');
		const navigation = await findNavigation();
		expect(navigation.getByRole('link', { name: 'Movies' }).getAttribute('aria-current')).toBe('page');
		await user.click(navigation.getByRole('link', { name: 'Settings' }));

		expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeTruthy();
		expect(currentPath()).toBe('/settings');
		expect(navigation.getByRole('link', { name: 'Settings' }).getAttribute('aria-current')).toBe('page');
		expect(navigation.getByRole('link', { name: 'Movies' }).getAttribute('aria-current')).toBeNull();
	});

	it('is a bottom bar at phone width', async () => {
		window.innerWidth = 390;
		startFakeApi({ signedIn: true });
		const user = userEvent.setup();

		openApp('/movies');
		const navigation = await findNavigation();
		await user.click(navigation.getByRole('link', { name: 'Settings' }));

		expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeTruthy();
		expect(navigation.getByRole('button', { name: 'More' })).toBeTruthy();
	});
});
