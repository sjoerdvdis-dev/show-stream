import { createFileRoute } from '@tanstack/react-router';
import { PageContainer, PageHeader } from '@workspace/ui/patterns/page';
import { SettingsSection } from '@workspace/ui/patterns/settings';

/** Only the account so far. The second ticket of Phase 2 item 6 adds Log out, Appearance and Library here. */
const SettingsPage = () => {
	const { user } = Route.useRouteContext();

	return (
		<PageContainer width="narrow">
			<PageHeader title="Settings" />
			<SettingsSection title="Account">
				<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
					<dt className="text-muted-foreground">Username</dt>
					<dd>{user.username}</dd>
					<dt className="text-muted-foreground">Role</dt>
					<dd className="capitalize">{user.role}</dd>
				</dl>
			</SettingsSection>
		</PageContainer>
	);
};

export const Route = createFileRoute('/_app/settings')({ component: SettingsPage });
