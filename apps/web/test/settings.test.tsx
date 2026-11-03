import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Scan } from '@workspace/contract/api-types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startFakeApi } from './support/fake-api';
import { fakeColorScheme } from './support/fake-color-scheme';
import { fakeSocket } from './support/fake-socket';
import { currentPath, findLoginPage, openApp, returnPath } from './support/render-app';

const findSection = async (name: string) => within(await screen.findByRole('region', { name }));

const finishedScan: Scan = {
	status: 'done',
	time: '2026-11-03T10:00:00.000Z',
	counts: { found: 12, added: 9, updated: 1, unmatched: 1, failed: 1 },
	errors: ['No TMDB match for Unknown Film (1999)', 'Could not save Broken Film (2001)'],
};

let system: ReturnType<typeof fakeColorScheme>;

beforeEach(() => {
	system = fakeColorScheme('light');
});

afterEach(() => {
	system.restore();
	localStorage.clear();
	document.documentElement.className = '';
	document.documentElement.removeAttribute('style');
});

describe('the account', () => {
	it('shows who is signed in', async () => {
		startFakeApi({ signedIn: true, role: 'user' });

		openApp('/settings');
		const account = await findSection('Account');

		expect(account.getByText('owner')).toBeTruthy();
		expect(account.getByText('user')).toBeTruthy();
	});

	it('logs out, keeping nothing', async () => {
		const api = startFakeApi({ signedIn: true });
		const user = userEvent.setup();

		openApp('/settings');
		const account = await findSection('Account');
		expect(fakeSocket.isOpen).toBe(true);
		await user.click(account.getByRole('button', { name: 'Log out' }));

		await findLoginPage();
		expect(api.signedIn).toBe(false);
		expect(returnPath()).toBeNull();
		expect(fakeSocket.isOpen).toBe(false);
	});
});

describe('the appearance', () => {
	it('follows the system until the user chooses, and keeps the choice across a reload', async () => {
		startFakeApi({ signedIn: true });
		const user = userEvent.setup();

		const page = openApp('/settings');
		const appearance = await findSection('Appearance');
		expect(appearance.getByRole('radio', { name: 'System' }).getAttribute('aria-checked')).toBe('true');
		expect(document.documentElement.classList.contains('dark')).toBe(false);

		await user.click(appearance.getByRole('radio', { name: 'Dark' }));
		expect(document.documentElement.classList.contains('dark')).toBe(true);

		page.unmount();
		document.documentElement.className = '';
		openApp('/settings');

		const reloaded = await findSection('Appearance');
		expect(reloaded.getByRole('radio', { name: 'Dark' }).getAttribute('aria-checked')).toBe('true');
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});

	it('names and describes each theme in a group named Theme', async () => {
		startFakeApi({ signedIn: true });

		openApp('/settings');
		const appearance = await findSection('Appearance');
		const theme = within(appearance.getByRole('group', { name: 'Theme' }));

		expect(
			theme.getByRole('radio', { name: 'System', description: 'Follows this device, and changes when it does.' }),
		).toBeTruthy();
		expect(theme.getByRole('radio', { name: 'Dark', description: 'Dark at all times.' })).toBeTruthy();
		expect(theme.getByRole('radio', { name: 'Light', description: 'Light at all times.' })).toBeTruthy();
	});

	it('chooses by keyboard, with the group as one tab stop', async () => {
		startFakeApi({ signedIn: true });
		const user = userEvent.setup();

		openApp('/settings');
		const appearance = await findSection('Appearance');
		appearance.getByRole('radio', { name: 'System' }).focus();
		await user.keyboard('{ArrowDown}');

		const dark = appearance.getByRole('radio', { name: 'Dark' });
		expect(dark.getAttribute('aria-checked')).toBe('true');
		expect(document.activeElement).toBe(dark);
		expect(document.documentElement.classList.contains('dark')).toBe(true);

		await user.tab();
		expect(appearance.queryAllByRole('radio')).not.toContain(document.activeElement);
		await user.tab({ shift: true });
		expect(document.activeElement).toBe(dark);
	});
});

describe('the library section', () => {
	it('is not there for a user', async () => {
		startFakeApi({ signedIn: true, role: 'user' });

		openApp('/settings');
		await findSection('Account');

		expect(screen.queryByRole('region', { name: 'Library' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'Scan library' })).toBeNull();
	});

	it.each(['owner', 'admin'] as const)('starts a scan for an %s, and shows it while it runs', async (role) => {
		const api = startFakeApi({ signedIn: true, role });
		const user = userEvent.setup();

		openApp('/settings');
		const library = await findSection('Library');
		expect(await library.findByText('No scan has run yet.')).toBeTruthy();

		await user.click(library.getByRole('button', { name: 'Scan library' }));

		expect(await library.findByText(/^The scan is waiting for the worker\. Asked for/)).toBeTruthy();
		expect(api.scanRequests).toBe(1);
		const busy = library.getByRole('button', { name: 'Scan library' }) as HTMLButtonElement;
		expect(busy.disabled).toBe(true);
		expect(busy.getAttribute('aria-busy')).toBe('true');
		// The scan's own status speaks for it, so the button's spinner adds none.
		expect(within(busy).queryByRole('status')).toBeNull();

		api.scan = { ...api.scan!, status: 'running' };
		expect(await library.findByText(/^Scanning the library\. Asked for/)).toBeTruthy();
		expect((library.getByRole('button', { name: 'Scan library' }) as HTMLButtonElement).disabled).toBe(true);

		api.scan = finishedScan;
		expect(await library.findByText(/^Last scan finished/)).toBeTruthy();
		expect((library.getByRole('button', { name: 'Scan library' }) as HTMLButtonElement).disabled).toBe(false);
	});

	it('shows the counts and problems of the latest scan', async () => {
		startFakeApi({ signedIn: true, scan: { ...finishedScan, counts: { ...finishedScan.counts, failed: 3 } } });

		openApp('/settings');
		const library = await findSection('Library');

		await library.findByText(/^Last scan finished/);
		const count = (label: string) => library.getByText(label, { selector: 'dt' }).parentElement?.textContent;
		expect(count('Found')).toBe('Found12');
		expect(count('Added')).toBe('Added9');
		expect(count('Updated')).toBe('Updated1');
		expect(count('Unmatched')).toBe('Unmatched1');
		expect(count('Failed')).toBe('Failed3');
		const problems = within(library.getByRole('list', { name: 'Scan problems' }));
		expect(problems.getByText('No TMDB match for Unknown Film (1999)')).toBeTruthy();
		expect(problems.getByText('Could not save Broken Film (2001)')).toBeTruthy();
		// One unmatched and three failed, of which two are listed.
		expect(problems.getByText('And 2 more.')).toBeTruthy();
	});

	it('shows why a scan failed', async () => {
		startFakeApi({
			signedIn: true,
			scan: { ...finishedScan, status: 'failed', error: 'The media folder is missing', errors: [] },
		});

		openApp('/settings');
		const library = await findSection('Library');

		expect(await library.findByText(/^Last scan failed/)).toBeTruthy();
		expect(library.getByText('The media folder is missing')).toBeTruthy();
	});

	it('shows when a scan another tab started was asked for, and disables Scan library while it runs', async () => {
		startFakeApi({ signedIn: true, scan: { ...finishedScan, status: 'running' } });

		openApp('/settings');
		const library = await findSection('Library');

		const status = await library.findByText(/^Scanning the library\. Asked for/);
		const askedFor = new Date(finishedScan.time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
		expect(status.textContent).toBe(`Scanning the library. Asked for ${askedFor}.`);
		expect(status.querySelector('time')?.dateTime).toBe(finishedScan.time);
		// The counts are all zero until the scan finishes, so they wait for it.
		expect(library.queryByText('Found', { selector: 'dt' })).toBeNull();
		expect((library.getByRole('button', { name: 'Scan library' }) as HTMLButtonElement).disabled).toBe(true);
	});

	it('returns to login when the session ends', async () => {
		const api = startFakeApi({ signedIn: true });
		const user = userEvent.setup();

		openApp('/settings');
		const library = await findSection('Library');
		await library.findByText('No scan has run yet.');
		api.signedIn = false;
		await user.click(library.getByRole('button', { name: 'Scan library' }));

		await findLoginPage();
		await waitFor(() => expect(currentPath()).toBe('/login'));
		expect(returnPath()).toBe('/settings');
	});
});
