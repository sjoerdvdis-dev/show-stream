import { createFileRoute } from '@tanstack/react-router';
import { PageContainer, PageHeader } from '@workspace/ui/patterns/page';
import { AccountSection } from '@/features/settings/account-section';
import { AppearanceSection } from '@/features/settings/appearance-section';
import { LibrarySection } from '@/features/settings/library-section';

const SettingsPage = () => {
	const { user } = Route.useRouteContext();
	// Only for the user's experience: the API refuses a scan from anyone else.
	const isAdmin = user.role === 'owner' || user.role === 'admin';

	return (
		<PageContainer width="narrow" className="gap-10">
			<PageHeader title="Settings" />
			<AccountSection user={user} />
			<AppearanceSection />
			{isAdmin ? <LibrarySection /> : null}
		</PageContainer>
	);
};

export const Route = createFileRoute('/_app/settings')({ component: SettingsPage });
