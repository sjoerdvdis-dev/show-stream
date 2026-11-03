import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet, useRouter } from '@tanstack/react-router';
import { Toaster } from '@workspace/ui/components/sonner';
import { LinkProvider } from '@workspace/ui/patterns/link';
import { RouterLink } from '@/lib/router-link';
import { useTheme } from '@/lib/theme';

export type RouterContext = {
	queryClient: QueryClient;
	/** A session ended by itself: clears cached data, and goes to login with the return path. */
	onSessionLost: () => void;
	/** The user logged out: clears cached data, and goes to login. */
	onLoggedOut: () => void;
};

const Message = ({ children }: { children: React.ReactNode }) => (
	<main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">{children}</main>
);

const ServerError = () => {
	const router = useRouter();
	return (
		<Message>
			<p role="alert">Could not reach the server.</p>
			<button type="button" className="underline" onClick={() => void router.invalidate()}>
				Try again
			</button>
		</Message>
	);
};

const NotFound = () => (
	<Message>
		<p>This page does not exist.</p>
		<Link to="/" className="underline">
			Go to the library
		</Link>
	</Message>
);

const Loading = () => <Message>Loading…</Message>;

const Root = () => {
	const { resolvedTheme } = useTheme();
	return (
		<LinkProvider component={RouterLink}>
			<Outlet />
			<Toaster theme={resolvedTheme} position="bottom-right" />
		</LinkProvider>
	);
};

export const Route = createRootRouteWithContext<RouterContext>()({
	component: Root,
	errorComponent: ServerError,
	notFoundComponent: NotFound,
	pendingComponent: Loading,
});
