import { Label } from '@workspace/ui/components/label';
import { RadioGroup, RadioGroupItem } from '@workspace/ui/components/radio-group';
import { SettingsSection } from '@workspace/ui/patterns/settings';
import { useId } from 'react';
import { useTheme, type Theme } from '@/lib/theme';

const themes: { value: Theme; label: string; description: string }[] = [
	{ value: 'system', label: 'System', description: 'Follows this device, and changes when it does.' },
	{ value: 'dark', label: 'Dark', description: 'Dark at all times.' },
	{ value: 'light', label: 'Light', description: 'Light at all times.' },
];

/** The theme, kept in this browser, so it shows from the first paint of the next visit. */
export const AppearanceSection = () => {
	const { theme, setTheme } = useTheme();
	const legendId = useId();

	return (
		<SettingsSection title="Appearance" description="Kept in this browser.">
			<p id={legendId} className="font-medium">
				Theme
			</p>
			<RadioGroup aria-labelledby={legendId} value={theme} onValueChange={(value) => setTheme(value as Theme)}>
				{themes.map(({ value, label, description }) => {
					// Named by its label alone, and described by the rest.
					const labelId = `${legendId}-${value}`;
					const descriptionId = `${labelId}-description`;
					return (
						<Label key={value} className="items-start gap-3 py-1 font-normal">
							<RadioGroupItem
								value={value}
								aria-labelledby={labelId}
								aria-describedby={descriptionId}
								className="mt-0.5"
							/>
							<span className="flex flex-col gap-0.5">
								<span id={labelId} className="font-medium">
									{label}
								</span>
								<span id={descriptionId} className="text-muted-foreground">
									{description}
								</span>
							</span>
						</Label>
					);
				})}
			</RadioGroup>
		</SettingsSection>
	);
};
