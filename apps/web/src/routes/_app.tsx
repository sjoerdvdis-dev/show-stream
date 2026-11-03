import { createFileRoute, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@workspace/ui/components/sidebar';
import { AppShell, type NavItem } from '@workspace/ui/patterns/app-shell';
import { AppLink } from '@workspace/ui/patterns/link';
import { Film, LogOut, Settings } from 'lucide-react';
import { sessionQuery } from '@/features/auth/queries';
import { useLogout } from '@/features/auth/use-logout';
import { useNotifications } from '@/features/library/use-notifications';

const navigation: Omit<NavItem, 'active'>[] = [
	{ href: '/movies', label: 'Movies', icon: Film },
	{ href: '/settings', label: 'Settings', icon: Settings },
];

const SignedInLayout = () => {
	const { user } = Route.useRouteContext();
	const logout = useLogout();
	const pathname = useRouterState({ select: ({ location }) => location.pathname });
	useNotifications();

	const items = navigation.map((item) => ({
		...item,
		active: pathname === item.href || pathname.startsWith(`${item.href}/`),
	}));

	return (
		<AppShell
			items={items}
			brand={
				<AppLink href="/movies" className="font-semibold">
					ShowStream
				</AppLink>
			}
			footer={
				<SidebarMenu>
					<SidebarMenuItem>
						<p className="truncate px-2 py-1 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
							Signed in as {user.username}
						</p>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton tooltip="Log out" disabled={logout.isPending} onClick={() => logout.mutate()}>
							<LogOut aria-hidden="true" />
							<span>Log out</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			}
		>
			<Outlet />
		</AppShell>
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
