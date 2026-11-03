import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider, useTheme, type Theme } from '@/lib/theme';
import { fakeColorScheme } from './support/fake-color-scheme';

const choices: Theme[] = ['system', 'dark', 'light'];

/** What a theme control shows: the choice, and the buttons that change it. */
const ThemeControl = () => {
	const { theme, setTheme } = useTheme();
	return (
		<>
			<p>Theme: {theme}</p>
			{choices.map((choice) => (
				<button key={choice} type="button" onClick={() => setTheme(choice)}>
					{choice}
				</button>
			))}
		</>
	);
};

const openPage = () =>
	render(
		<ThemeProvider>
			<ThemeControl />
		</ThemeProvider>,
	);

const looksDark = () => document.documentElement.classList.contains('dark');

let system: ReturnType<typeof fakeColorScheme>;

beforeEach(() => {
	system = fakeColorScheme('light');
});

afterEach(() => {
	system.restore();
	localStorage.clear();
	document.documentElement.className = '';
});

describe('the theme', () => {
	it('follows the system by default, including when it changes', () => {
		system.set('dark');
		openPage();

		expect(screen.getByText('Theme: system')).toBeTruthy();
		expect(looksDark()).toBe(true);

		act(() => system.set('light'));
		expect(looksDark()).toBe(false);

		act(() => system.set('dark'));
		expect(looksDark()).toBe(true);
	});

	it('keeps an explicit choice when the page opens again, whatever the system says', async () => {
		const user = userEvent.setup();
		const page = openPage();

		await user.click(screen.getByRole('button', { name: 'dark' }));
		expect(looksDark()).toBe(true);

		page.unmount();
		document.documentElement.className = '';
		openPage();

		expect(screen.getByText('Theme: dark')).toBeTruthy();
		expect(looksDark()).toBe(true);

		act(() => system.set('dark'));
		act(() => system.set('light'));
		expect(looksDark()).toBe(true);
	});

	it('goes back to following the system when chosen again', async () => {
		const user = userEvent.setup();
		openPage();

		await user.click(screen.getByRole('button', { name: 'dark' }));
		await user.click(screen.getByRole('button', { name: 'system' }));

		expect(looksDark()).toBe(false);
		act(() => system.set('dark'));
		expect(looksDark()).toBe(true);
	});

	it.each(['sepia', '', '{"theme":"dark"}'])('follows the system when the stored choice is %j', (stored) => {
		localStorage.setItem('theme', stored);
		system.set('dark');
		openPage();

		expect(screen.getByText('Theme: system')).toBeTruthy();
		expect(looksDark()).toBe(true);
	});

	it('follows the system when storage cannot be read', () => {
		const getItem = Storage.prototype.getItem;
		Storage.prototype.getItem = () => {
			throw new Error('Storage is disabled');
		};
		try {
			system.set('dark');
			openPage();
			expect(screen.getByText('Theme: system')).toBeTruthy();
			expect(looksDark()).toBe(true);
		} finally {
			Storage.prototype.getItem = getItem;
		}
	});
});

/**
 * The script in `index.html` that applies the theme before first paint. A real browser checks
 * that no wrong frame shows. This checks that it agrees with the provider.
 */
describe('the theme before first paint', () => {
	const runFirstPaintScript = () => {
		const html = readFileSync(path.resolve(import.meta.dirname, '../index.html'), 'utf8');
		const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
		if (!script) {
			throw new Error('index.html has no inline script');
		}
		// eslint-disable-next-line @typescript-eslint/no-implied-eval -- runs the shipped script as the browser would
		new Function(script)();
	};

	it.each([
		['dark', 'light', true],
		['light', 'dark', false],
		['system', 'dark', true],
		['system', 'light', false],
		['sepia', 'dark', true],
		[null, 'dark', true],
		[null, 'light', false],
	] as const)('with %j stored and a %s system, is dark: %s', (stored, scheme, dark) => {
		if (stored !== null) {
			localStorage.setItem('theme', stored);
		}
		system.set(scheme);
		runFirstPaintScript();
		expect(looksDark()).toBe(dark);
	});

	it('still runs when storage cannot be read', () => {
		const getItem = Storage.prototype.getItem;
		Storage.prototype.getItem = () => {
			throw new Error('Storage is disabled');
		};
		try {
			system.set('dark');
			runFirstPaintScript();
			expect(looksDark()).toBe(true);
		} finally {
			Storage.prototype.getItem = getItem;
		}
	});
});
