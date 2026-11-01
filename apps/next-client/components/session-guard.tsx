'use client';

import { useEffect, useState } from 'react';
import LoadingCircle from '@/components/icons/loading-circle';
import { UserContext } from '@/hooks/use-user';
import { api, isSessionEnded, returnToLogin } from '@/lib/api';
import type { User } from '@workspace/contract/api-types';

/**
 * Sends a visitor with no session to login. This is only for the user's experience: the API
 * checks the session on every request.
 */
export default function SessionGuard({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		api
			.me()
			.then((session) => setUser(session.user))
			.catch((error: unknown) => {
				if (isSessionEnded(error)) {
					returnToLogin();
				} else {
					setFailed(true);
				}
			});
	}, []);

	if (user) {
		return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
	}

	return (
		<div className="w-full h-screen flex items-center justify-center">
			{failed ? <p>Could not reach the server.</p> : <LoadingCircle size="64" />}
		</div>
	);
}
