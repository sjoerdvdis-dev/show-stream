import type { ReactNode } from 'react';

/** The page around the login and setup forms. */
export const CenteredPage = ({ title, children }: { title: string; children: ReactNode }) => (
	<main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-8">
		<h1 className="text-2xl font-semibold">{title}</h1>
		{children}
	</main>
);
