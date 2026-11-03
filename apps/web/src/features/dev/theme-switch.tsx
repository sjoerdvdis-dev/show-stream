import { useTheme, type Theme } from '@/lib/theme';

const themes: { value: Theme; label: string }[] = [
	{ value: 'system', label: 'System' },
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' },
];

/** Switches the page between the system theme, light and dark, for the dev previews. */
export const ThemeSwitch = () => {
	const { theme, setTheme } = useTheme();
	return (
		<div role="group" aria-label="Theme" className="flex w-fit gap-1 rounded-lg border border-border bg-card p-1">
			{themes.map(({ value, label }) => (
				<button
					key={value}
					type="button"
					aria-pressed={theme === value}
					onClick={() => setTheme(value)}
					className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
				>
					{label}
				</button>
			))}
		</div>
	);
};
