import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { toReturnPath } from '@/features/auth/return-path';
import { createQueryClient } from '@/lib/query-client';
import { routeTree } from '@/routeTree.gen';
import { ThemeProvider } from '@/lib/theme';

/**
 * The router and the query client, wired together. They need each other, because a 401 in a
 * query has to navigate, so they are built here and nowhere else.
 */
export const createApp = () => {
	/** Nothing from the ended session stays in memory. */
	const leaveForLogin = (redirect?: string) => {
		queryClient.clear();
		void router.navigate({ to: '/login', search: { redirect }, replace: true });
	};

	/** The one path for a session that ended by itself. Several calls can find out at once. */
	const onSessionLost = () => {
		const { pathname, href } = router.latestLocation;
		if (pathname !== '/login') {
			leaveForLogin(toReturnPath(href));
		}
	};

	const queryClient = createQueryClient(onSessionLost);
	const router = createRouter({
		routeTree,
		context: { queryClient, onSessionLost, onLoggedOut: () => leaveForLogin() },
	});

	return { queryClient, router };
};

export type App = ReturnType<typeof createApp>;

declare module '@tanstack/react-router' {
	interface Register {
		router: App['router'];
	}
}

export const App = ({ app: { queryClient, router } }: { app: App }) => (
	<ThemeProvider>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</ThemeProvider>
);
