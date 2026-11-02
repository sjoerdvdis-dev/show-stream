import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { correctPassword, startFakeApi } from './support/fake-api';
import { currentPath, findLoginPage, findMoviesPage, logIn, openApp } from './support/render-app';

describe('the login form', () => {
	it('shows a wrong password and stays on the form', async () => {
		startFakeApi();

		openApp('/login');
		await logIn('wrong');

		expect((await screen.findByRole('alert')).textContent).toBe('Invalid username or password');
		expect(currentPath()).toBe('/login');
	});

	it('shows the message of the rate limit', async () => {
		startFakeApi({ rateLimited: true });

		openApp('/login');
		await logIn();

		expect((await screen.findByRole('alert')).textContent).toBe('Too many attempts. Try again later');
	});

	it('validates with the contract before asking the API', async () => {
		startFakeApi();
		const user = userEvent.setup();

		openApp('/login');
		await findLoginPage();
		await user.click(screen.getByRole('button', { name: 'Log in' }));

		expect((await screen.findByText('Username must be non-empty text')).id).toBe('username-error');
		expect(screen.getByText('Password must be non-empty text').id).toBe('password-error');
		expect(screen.getByLabelText('Username').getAttribute('aria-invalid')).toBe('true');
	});

	it('works with the keyboard alone', async () => {
		startFakeApi();
		const user = userEvent.setup();

		openApp('/login');
		await findLoginPage();
		await user.tab();
		await user.keyboard('owner');
		await user.tab();
		await user.keyboard(`${correctPassword}{Enter}`);

		await findMoviesPage();
	});
});

describe('the setup form', () => {
	it('asks for the length the contract asks for', async () => {
		startFakeApi({ setupNeeded: true });
		const user = userEvent.setup();

		openApp('/setup');
		await user.type(await screen.findByLabelText('Username'), 'owner');
		await user.type(screen.getByLabelText('Password'), 'short');
		await user.click(screen.getByRole('button', { name: 'Create account' }));

		expect(await screen.findByText('Password must have at least 8 characters')).toBeTruthy();
		expect(currentPath()).toBe('/setup');
	});
});
