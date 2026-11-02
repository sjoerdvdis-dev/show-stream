import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router';
import { sessionQuery } from '@/features/auth/queries';
import { useLogout } from '@/features/auth/use-logout';
import { useNotifications } from '@/lib/use-notifications';

const SignedInLayout = () => {
	const { user } = Route.useRouteContext();
	const logout = useLogout();
	useNotifications();

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-4">
			<header className="flex flex-wrap items-center justify-between gap-2">
				<Link to="/movies" className="font-semibold">
					ShowStream
				</Link>
				<div className="flex items-center gap-3">
					<span className="text-sm opacity-70">{user.username}</span>
					<button type="button" className="underline" disabled={logout.isPending} onClick={() => logout.mutate()}>
						Log out
					</button>
				</div>
			</header>
			<main>
				<Outlet />
			</main>
		</div>
	);
};

/** Only for the user's experience: the API checks the session on every request. */
export const Route = createFileRoute('/_app')({
	beforeLoad: async ({ context: { queryClient }, location }) => {
		const user = await queryClient.fetchQuery(sessionQuery);
		if (!user) {
			throw redirect({ to: '/login', search: { redirect: location.href }, replace: true });
		}
		return { user };
	},
	component: SignedInLayout,
});
