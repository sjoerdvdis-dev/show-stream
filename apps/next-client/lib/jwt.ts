'use server';

import { cookies } from 'next/headers';
import type { AuthenticateAPIData, User } from '@workspace/types/api-types';

export const verifyToken = async (token: string): Promise<AuthenticateAPIData | null> => {
	const response = await fetch(`${process.env.API_SERVER_URL}/authenticate`, {
		method: 'POST',
		body: JSON.stringify({ token }),
		headers: {
			'Content-Type': 'application/json',
		},
	});
	if (!response.ok) {
		return null;
	}
	const data = (await response.json()) as AuthenticateAPIData;
	return data;
};

export const verifyUser = async (): Promise<User | null> => {
	const cookieStore = await cookies();
	const cookieToken = cookieStore.get('authToken');

	if (!cookieToken) {
		return null;
	}

	const token = cookieToken.value;
	const { user, valid } = (await verifyToken(token)) || {};

	if (!valid || !user) {
		return null;
	}

	return user;
};
