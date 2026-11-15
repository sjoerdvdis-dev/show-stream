import { Button } from '@workspace/ui/components/button';
import { SettingsSection } from '@workspace/ui/patterns/settings';
import { Download } from 'lucide-react';
import { useInstallPrompt } from '@/features/app/install-prompt';

/**
 * Install, where the browser offers it, and how to install where it does not. Nothing in the
 * installed app, which has nothing left to install.
 */
export const AppSection = () => {
	const { state, install } = useInstallPrompt();

	if (state === 'standalone') return null;

	return (
		<SettingsSection title="App" description="Install ShowStream on this device, to open it like any other app.">
			{state === 'available' ? (
				<>
					<p className="text-sm text-muted-foreground">
						It gets its own window and icon, and opens without the browser around it.
					</p>
					<Button className="w-fit" onClick={() => void install()}>
						<Download aria-hidden="true" data-icon="inline-start" />
						Install
					</Button>
				</>
			) : state === 'installed' ? (
				<p className="text-sm">ShowStream is installed. Open it from your home screen or your apps.</p>
			) : (
				<>
					<p className="text-sm">This browser installs apps from its own menu:</p>
					<ul className="flex list-disc flex-col gap-1 ps-5 text-sm text-muted-foreground">
						<li>Safari on iPhone or iPad: Share, then Add to Home Screen.</li>
						<li>Safari on a Mac: File, then Add to Dock.</li>
						<li>Chrome or Edge: Install in the address bar or in the menu.</li>
					</ul>
					<p className="text-sm text-muted-foreground">
						Firefox on a computer cannot install apps. Installing also needs the server&apos;s HTTPS certificate to be
						trusted on this device.
					</p>
				</>
			)}
		</SettingsSection>
	);
};
