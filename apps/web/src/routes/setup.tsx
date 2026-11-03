import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { CenteredPage } from '@/features/auth/centered-page';
import { CredentialsForm } from '@/features/auth/credentials-form';
import { setupStatusQuery } from '@/features/auth/queries';

const SetupPage = () => {
	const router = useRouter();

	return (
		<CenteredPage
			title="Create the owner account"
			description="This is a new install. The owner runs the server, scans the library and adds other users."
		>
			<CredentialsForm mode="setup" onDone={() => void router.navigate({ to: '/', replace: true })} />
		</CenteredPage>
	);
};

export const Route = createFileRoute('/setup')({
	beforeLoad: async ({ context: { queryClient } }) => {
		const { needed } = await queryClient.fetchQuery(setupStatusQuery);
		if (!needed) {
			throw redirect({ to: '/login', replace: true });
		}
	},
	component: SetupPage,
});
