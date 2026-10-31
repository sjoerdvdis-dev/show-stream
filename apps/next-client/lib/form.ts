import { z } from 'zod';

// TODO: Max length for username and password

export const loginSchema = z.object({
	username: z.string().min(1, 'Username is required'),
	password: z.string().min(1, 'Password is required'),
});
