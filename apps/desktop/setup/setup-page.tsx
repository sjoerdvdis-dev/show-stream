import { useState, type FormEvent } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@workspace/ui/components/field';
import { Input } from '@workspace/ui/components/input';
import { Spinner } from '@workspace/ui/components/spinner';
import type { DesktopBridge } from '../src/bridge';

/**
 * Asks for the server's address. The main process checks it, and on success saves it and loads the
 * server in this window, so this page only ever shows the reason an address was refused.
 */
export const SetupPage = ({
	connect,
	initialAddress,
	initialMessage,
}: {
	connect: DesktopBridge['connect'];
	initialAddress: string;
	initialMessage?: string;
}) => {
	const [address, setAddress] = useState(initialAddress);
	const [message, setMessage] = useState(initialMessage);
	const [checking, setChecking] = useState(false);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setChecking(true);
		setMessage(undefined);
		try {
			const result = await connect(address);
			if (!result.ok) {
				setMessage(result.message);
			}
		} catch {
			setMessage('Something went wrong. Try again.');
		} finally {
			setChecking(false);
		}
	};

	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-8">
			<p className="text-lg font-semibold tracking-tight">ShowStream</p>
			<Card className="w-full max-w-sm [--card-spacing:--spacing(6)]">
				<CardHeader>
					<CardTitle>
						<h1 className="text-xl font-semibold tracking-tight">Connect to your server</h1>
					</CardTitle>
					<CardDescription>Enter the address you open ShowStream at in a browser.</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={(event) => void onSubmit(event)} noValidate>
						<FieldGroup>
							<Field data-invalid={Boolean(message) || undefined}>
								<FieldLabel htmlFor="address">Server address</FieldLabel>
								<Input
									id="address"
									name="address"
									inputMode="url"
									autoComplete="url"
									autoCapitalize="none"
									spellCheck={false}
									placeholder="media.example.com"
									autoFocus
									value={address}
									onChange={(event) => setAddress(event.target.value)}
									aria-invalid={Boolean(message)}
									aria-describedby={message ? 'address-hint address-error' : 'address-hint'}
								/>
								<FieldDescription id="address-hint">
									Such as media.example.com. https:// is added for you.
								</FieldDescription>
								{message ? (
									<FieldError id="address-error">
										{message}
									</FieldError>
								) : null}
							</Field>
							<Button type="submit" size="lg" disabled={checking} aria-busy={checking || undefined}>
								{checking ? <Spinner aria-hidden="true" data-icon="inline-start" /> : null}
								Connect
							</Button>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</main>
	);
};
