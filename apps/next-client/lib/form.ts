import { z } from 'zod';
import { minimumPasswordLength } from '@workspace/contract/endpoints';

// TODO: Max length for username and password

export const loginSchema = z.object({
	username: z.string().min(1, 'Username is required'),
	password: z.string().min(1, 'Password is required'),
});

export const setupSchema = loginSchema.extend({
	password: z.string().min(minimumPasswordLength, `Use at least ${minimumPasswordLength} characters`),
});
