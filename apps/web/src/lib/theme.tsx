import { createContext, use, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';

export type Theme = 'system' | 'dark' | 'light';

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
	resolvedTheme: 'dark' | 'light';
	setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContext | null>(null);

/** Keeps the theme choice, and puts the `dark` class on `<html>` when the page should be dark. */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
	const [theme, setThemeState] = useState(readStoredTheme);
	const [systemScheme] = useState(() => window.matchMedia(darkQuery));
	const systemDark = useSyncExternalStore(
		(onChange) => {
			systemScheme.addEventListener('change', onChange);
			return () => systemScheme.removeEventListener('change', onChange);
		},
		() => systemScheme.matches,
	);

	const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

	useLayoutEffect(() => {
		document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
	}, [resolvedTheme]);

	const value = useMemo(
		() => ({
			theme,
			resolvedTheme,
			setTheme: (next: Theme) => {
				storeTheme(next);
				setThemeState(next);
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
