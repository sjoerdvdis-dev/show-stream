import type { User } from '@workspace/contract/api-types';
import { Button } from '@workspace/ui/components/button';
import { SettingsSection } from '@workspace/ui/patterns/settings';
import { LoaderCircle, LogOut } from 'lucide-react';
import { useLogout } from '@/features/auth/use-logout';

/** Who is signed in, and Log out, which ends the session for this browser. */
export const AccountSection = ({ user }: { user: User }) => {
	const logout = useLogout();

	return (
		<SettingsSection title="Account" description="Who is signed in on this browser.">
			<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
				<dt className="text-muted-foreground">Username</dt>
				<dd className="min-w-0 break-words">{user.username}</dd>
				<dt className="text-muted-foreground">Role</dt>
				<dd className="capitalize">{user.role}</dd>
			</dl>
			<Button
				variant="outline"
				className="w-fit"
				disabled={logout.isPending}
				aria-busy={logout.isPending || undefined}
				onClick={() => logout.mutate()}
			>
				{logout.isPending ? (
					<LoaderCircle aria-hidden="true" data-icon="inline-start" className="animate-spin" />
				) : (
					<LogOut aria-hidden="true" data-icon="inline-start" />
				)}
				Log out
			</Button>
		</SettingsSection>
	);
};
