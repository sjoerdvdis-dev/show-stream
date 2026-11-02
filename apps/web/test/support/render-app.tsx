import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, createApp } from '@/lib/app';
import { correctPassword } from './fake-api';

/** Opens the real app at `url`, as a page load does. */
export const openApp = (url: string) => {
	window.history.replaceState(null, '', url);
	return render(<App app={createApp()} />);
};

export const currentPath = () => window.location.pathname;

export const returnPath = () => new URLSearchParams(window.location.search).get('redirect');

export const logIn = async (password = correctPassword) => {
	const user = userEvent.setup();
	await user.type(await screen.findByLabelText('Username'), 'owner');
	await user.type(screen.getByLabelText('Password'), password);
	await user.click(screen.getByRole('button', { name: 'Log in' }));
};

export const findLoginPage = () => screen.findByRole('heading', { name: 'Log in to ShowStream' });
export const findMoviesPage = () => screen.findByRole('heading', { name: 'Movies' });
export const findSetupPage = () => screen.findByRole('heading', { name: 'Create the owner account' });
