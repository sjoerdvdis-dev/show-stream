import { createFileRoute } from '@tanstack/react-router';
import { PageContainer, PageHeader } from '@workspace/ui/patterns/page';
import { canManageLibrary } from '@/features/auth/roles';
import { AccountSection } from '@/features/settings/account-section';
import { AppearanceSection } from '@/features/settings/appearance-section';
import { LibrarySection } from '@/features/settings/library-section';

const SettingsPage = () => {
	const { user } = Route.useRouteContext();

	return (
		<PageContainer width="narrow" className="gap-10">
			<PageHeader title="Settings" />
			<AccountSection user={user} />
			<AppearanceSection />
			{canManageLibrary(user) ? <LibrarySection /> : null}
		</PageContainer>
	);
};

export const Route = createFileRoute('/_app/settings')({ component: SettingsPage });
