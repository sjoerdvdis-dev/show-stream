'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';
import { loginSchema } from '@/lib/form';
import type { LoginAPIData } from '@workspace/types/api-types';

// Try to login, if successful set authToken cookie for later use
// https://leapcell.io/blog/implement-jwt-middleware-nextjs-auth

export const login = async (values: z.infer<typeof loginSchema>) => {
	const validation = loginSchema.safeParse(values);

	if (!validation.success) {
		return { error: 'Invalid username or password', success: false };
	}

	const { username, password } = validation.data;

	const response = await fetch(`${process.env.API_SERVER_URL}/login`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ username, password }),
	});

	if (!response.ok) {
		return { error: 'Invalid username or password', success: false };
	}

	const { token } = (await response.json()) as LoginAPIData;
	if (!token) {
		return { error: 'Invalid username or password', success: false };
	}

	// Store token in authToken cookie
	const cookieStore = await cookies();
	cookieStore.set({
		name: 'authToken',
		value: token,
		httpOnly: true,
		// secure: true, TODO: needed for production in HTTPS
		path: '/',
	});

	return { success: true };
};
