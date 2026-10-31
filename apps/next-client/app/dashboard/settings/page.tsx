'use client';

import { useUser } from '@/hooks/use-user';

export default function SettingsPage() {
	const user = useUser();

	return <div>{JSON.stringify(user)}</div>;
}
