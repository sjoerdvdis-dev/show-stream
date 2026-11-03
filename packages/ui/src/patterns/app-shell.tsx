import { Ellipsis, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@workspace/ui/components/sheet';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarRail,
	SidebarTrigger,
} from '@workspace/ui/components/sidebar';
import { useIsMobile } from '@workspace/ui/hooks/use-mobile';
import { cn } from '@workspace/ui/lib/utils';
import { AppLink } from '@workspace/ui/patterns/link';

/** One place in the app's navigation. The app decides which item is `active`, since patterns do not route. */
export type NavItem = { href: string; label: string; icon: LucideIcon; active?: boolean };

type NavProps = {
	items: NavItem[];
	/** The app's name or logo, at the top of the sidebar. */
	brand?: ReactNode;
	/** What sits below the navigation, such as the user's name and Log out. */
	footer?: ReactNode;
	/** Names the navigation landmark. */
	label?: string;
};

/** The desktop navigation: the sidebar primitive, collapsible to icons, with a brand at the top and a footer. */
export const NavSidebar = ({ items, brand, footer, label = 'Main', className }: NavProps & { className?: string }) => (
	<Sidebar collapsible="icon" className={className}>
		<SidebarHeader className="flex-row items-center justify-between">
			{brand ? <div className="min-w-0 truncate group-data-[collapsible=icon]:hidden">{brand}</div> : null}
			<SidebarTrigger />
		</SidebarHeader>
		<SidebarContent>
			<SidebarGroup>
				<nav aria-label={label}>
					<SidebarMenu>
						{items.map(({ href, label: itemLabel, icon: Icon, active = false }) => (
							<SidebarMenuItem key={href}>
								<SidebarMenuButton
									isActive={active}
									tooltip={itemLabel}
									render={<AppLink href={href} aria-current={active ? 'page' : undefined} />}
								>
									<Icon aria-hidden="true" />
									<span>{itemLabel}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</nav>
			</SidebarGroup>
		</SidebarContent>
		{footer ? <SidebarFooter>{footer}</SidebarFooter> : null}
		<SidebarRail />
	</Sidebar>
);

const mobileNavItemClassName =
	'flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-md px-1 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:text-primary [&_svg]:size-5 [&_svg]:shrink-0';

/** The phone navigation: a bottom bar of the same items, with the brand and footer in a More sheet. */
export const MobileNav = ({ items, brand, footer, label = 'Main', className }: NavProps & { className?: string }) => (
	<nav
		aria-label={label}
		className={cn('fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)]', className)}
	>
		<ul className="flex items-stretch gap-1 px-2 py-1">
			{items.map(({ href, label: itemLabel, icon: Icon, active = false }) => (
				<li key={href} className="min-w-0 flex-1">
					<AppLink href={href} aria-current={active ? 'page' : undefined} className={mobileNavItemClassName}>
						<Icon aria-hidden="true" />
						<span className="max-w-full truncate">{itemLabel}</span>
					</AppLink>
				</li>
			))}
			{brand || footer ? (
				<li className="min-w-0 flex-1">
					<Sheet>
						<SheetTrigger className={mobileNavItemClassName}>
							<Ellipsis aria-hidden="true" />
							<span>More</span>
						</SheetTrigger>
						<SheetContent side="bottom" className="pb-[env(safe-area-inset-bottom)]">
							<SheetHeader>
								<SheetTitle>More</SheetTitle>
							</SheetHeader>
							<div className="flex flex-col gap-4 px-4 pb-4">
								{brand}
								{footer}
							</div>
						</SheetContent>
					</Sheet>
				</li>
			) : null}
		</ul>
	</nav>
);

/**
 * The signed-in layout: `NavSidebar` on a wide screen and `MobileNav` on a phone, around the page in a `main`
 * landmark that leaves room for the bottom bar.
 */
export const AppShell = ({
	items,
	brand,
	footer,
	label,
	className,
	children,
}: NavProps & { className?: string; children: ReactNode }) => {
	const isMobile = useIsMobile();
	return (
		<SidebarProvider className={className}>
			{isMobile ? null : <NavSidebar items={items} brand={brand} footer={footer} label={label} />}
			<SidebarInset className={cn('min-w-0', isMobile && 'pb-[calc(4rem+env(safe-area-inset-bottom))]')}>
				{children}
			</SidebarInset>
			{isMobile ? <MobileNav items={items} brand={brand} footer={footer} label={label} /> : null}
		</SidebarProvider>
	);
};
