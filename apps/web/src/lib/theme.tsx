import { createContext, use, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';

export type Theme = 'system' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

/**
 * The stored choice. The inline script in `index.html` reads the same key and applies the theme
 * before first paint, so change both together.
 */
const storageKey = 'theme';
const darkQuery = '(prefers-color-scheme: dark)';

const isTheme = (value: unknown): value is Theme => value === 'system' || value === 'dark' || value === 'light';

/** Anything unreadable, from a corrupt value to disabled storage, means `system`. */
const readStoredTheme = (): Theme => {
	try {
		const stored = localStorage.getItem(storageKey);
		return isTheme(stored) ? stored : 'system';
	} catch {
		return 'system';
	}
};

const storeTheme = (theme: Theme) => {
	try {
		localStorage.setItem(storageKey, theme);
	} catch {
		// The choice still applies to this visit.
	}
};

type ThemeContext = {
	/** What the user chose. */
	theme: Theme;
	/** What the page shows. */
	resolvedTheme: ResolvedTheme;
	setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContext | null>(null);

/**
 * Keeps the theme choice, and puts the `dark` class and the matching `color-scheme` on `<html>`,
 * and the theme's color in the `theme-color` meta tag.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
	const [theme, setTheme] = useState(readStoredTheme);
	const [systemScheme] = useState(() => window.matchMedia(darkQuery));
	const systemDark = useSyncExternalStore(
		(onChange) => {
			systemScheme.addEventListener('change', onChange);
			return () => systemScheme.removeEventListener('change', onChange);
		},
		() => systemScheme.matches,
	);

	const resolvedTheme: ResolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

	useLayoutEffect(() => {
		const root = document.documentElement;
		root.classList.toggle('dark', resolvedTheme === 'dark');
		// As the script in `index.html` does. It wins over the stylesheet, so it must follow the choice.
		root.style.colorScheme = resolvedTheme;
		// The browser's or installed app's title bar, from the tokens that `index.html` holds.
		const themeColor = document.querySelector('meta[name="theme-color"]');
		const color = themeColor?.getAttribute(`data-${resolvedTheme}`);
		if (themeColor && color) themeColor.setAttribute('content', color);
	}, [resolvedTheme]);

	const value = useMemo(
		() => ({
			theme,
			resolvedTheme,
			setTheme: (next: Theme) => {
				storeTheme(next);
				setTheme(next);
			},
		}),
		[theme, resolvedTheme],
	);

	return <ThemeContext value={value}>{children}</ThemeContext>;
};

export const useTheme = () => {
	const context = use(ThemeContext);
	if (!context) {
		throw new Error('useTheme needs a ThemeProvider');
	}
	return context;
};
