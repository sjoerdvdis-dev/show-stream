import { createFileRoute, redirect } from '@tanstack/react-router';

/** Until Home exists, in Phase 5. */
export const Route = createFileRoute('/_app/')({
	beforeLoad: () => {
		throw redirect({ to: '/movies', replace: true });
	},
});
