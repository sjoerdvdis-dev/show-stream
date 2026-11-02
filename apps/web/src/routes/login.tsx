import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { z } from 'zod';
import { CenteredPage } from '@/features/auth/centered-page';
import { CredentialsForm } from '@/features/auth/credentials-form';
import { sessionQuery, setupStatusQuery } from '@/features/auth/queries';
import { toReturnPath } from '@/features/auth/return-path';

const searchSchema = z.object({
	redirect: z.string().transform(toReturnPath).optional().catch(undefined),
});

const LoginPage = () => {
	const router = useRouter();
	const { redirect: returnPath } = Route.useSearch();

	return (
		<CenteredPage title="Log in to ShowStream">
			<CredentialsForm mode="login" onDone={() => void router.navigate({ href: returnPath ?? '/', replace: true })} />
		</CenteredPage>
	);
};

export const Route = createFileRoute('/login')({
	validateSearch: searchSchema,
	beforeLoad: async ({ context: { queryClient }, search }) => {
		const { needed } = await queryClient.fetchQuery(setupStatusQuery);
		if (needed) {
			throw redirect({ to: '/setup', replace: true });
		}
		if (await queryClient.fetchQuery(sessionQuery)) {
			throw redirect({ href: search.redirect ?? '/', replace: true });
		}
	},
	component: LoginPage,
});
