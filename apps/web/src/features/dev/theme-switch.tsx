import { Button } from '@workspace/ui/components/button';
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
			{themes.map(({ value, label }) => {
				const pressed = theme === value;
				return (
					<Button
						key={value}
						variant={pressed ? 'default' : 'ghost'}
						aria-pressed={pressed}
						onClick={() => setTheme(value)}
					>
						{label}
					</Button>
				);
			})}
		</div>
	);
};
