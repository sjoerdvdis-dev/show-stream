import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from '@workspace/ui/components/field';
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
	const id = useId();

	return (
		<SettingsSection title="Appearance" description="Kept in this browser.">
			<FieldSet>
				<FieldLegend variant="label">Theme</FieldLegend>
				<RadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
					{themes.map(({ value, label, description }) => (
						<Field key={value} orientation="horizontal">
							<RadioGroupItem value={value} id={`${id}-${value}`} aria-describedby={`${id}-${value}-description`} />
							<FieldContent>
								<FieldLabel htmlFor={`${id}-${value}`}>{label}</FieldLabel>
								<FieldDescription id={`${id}-${value}-description`}>{description}</FieldDescription>
							</FieldContent>
						</Field>
					))}
				</RadioGroup>
			</FieldSet>
		</SettingsSection>
	);
};
