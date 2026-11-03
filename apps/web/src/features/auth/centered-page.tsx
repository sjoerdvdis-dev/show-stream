import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import type { ReactNode } from 'react';

/** The page around the login and setup forms: the name of the app, and the form in a card. */
export const CenteredPage = ({
	title,
	description,
	children,
}: {
	title: string;
	description: ReactNode;
	children: ReactNode;
}) => (
	<main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-8">
		<p className="text-lg font-semibold tracking-tight">ShowStream</p>
		<Card className="w-full max-w-sm [--card-spacing:--spacing(6)]">
			<CardHeader>
				<CardTitle>
					<h1 className="text-xl font-semibold tracking-tight">{title}</h1>
				</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	</main>
);
