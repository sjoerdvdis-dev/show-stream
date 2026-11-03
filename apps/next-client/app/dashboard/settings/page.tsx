'use client';

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LibraryScan } from '@/components/dashboard/library-scan';
import { useUser } from '@/hooks/use-user';
import { api, isSessionEnded, returnToLogin } from '@/lib/api';

export default function SettingsPage() {
	const user = useUser();
	const isAdmin = user?.role === 'owner' || user?.role === 'admin';

	const logOut = async () => {
		try {
			await api.logout();
		} catch (error) {
			if (!isSessionEnded(error)) {
				toast.error('Could not log out. Try again.', { closeButton: true });
				return;
			}
		}
		returnToLogin();
	};

	return (
		<div className="flex flex-col items-start gap-4">
			{isAdmin && <LibraryScan />}
			<div>{JSON.stringify(user)}</div>
			<Button onClick={logOut}>Log out</Button>
		</div>
	);
}
