'use client';

import { useEffect, useState } from 'react';
import { verifyUser } from '@/lib/jwt';
import type { User } from '@workspace/types/api-types';

export const useUser = () => {
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		const getUser = async () => {
			const user = await verifyUser();
			setUser(user);
		};
		getUser();
	}, [setUser]);

	return user;
};
