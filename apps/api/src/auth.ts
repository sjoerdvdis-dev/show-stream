import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { db } from './db';
import { ApiFailure } from './errors';
import { createUser, createUserIfMissing, findUserByUsername } from '@workspace/db';
import type { AuthenticateAPIData, LoginAPIData, RegisterAPIData, User } from '@workspace/contract/api-types';

/**
 * Authentication API
 * - Register user with user/password
 * - Sign-in with user/password -> JWT
 * - JWT verification
 * - JWT refresh
 */

// POST /register (TEMP)
export const register = async (params: { username: string; password: string }): Promise<RegisterAPIData> => {
	const { username, password } = params;

	createUser(db, { username, passwordHash: await bcrypt.hash(password, 10) });
	return { success: true };
};

// Creates the TEMP account on first start. It exists on every later start.
export const ensureDefaultUser = async () => {
	if (!findUserByUsername(db, 'admin')) {
		createUserIfMissing(db, { username: 'admin', passwordHash: await bcrypt.hash('admin', 10), role: 'admin' });
	}
};

const loginFailed = () => new ApiFailure('unauthorized', 'Invalid username or password');

// POST /login
export const login = async (params: { username: string; password: string }): Promise<LoginAPIData> => {
	const { username, password } = params;

	const user = findUserByUsername(db, username);
	if (!user) {
		throw loginFailed();
	}

	const passwordMatch = await bcrypt.compare(password, user.passwordHash);

	if (!passwordMatch) {
		throw loginFailed();
	}

	const userData: User = { userId: String(user.id), username: user.username };

	const token = jwt.sign(userData, config.jwt.secret, {
		expiresIn: config.jwt.expiresInSeconds,
	});

	return { token };
};

// POST /authenticate
export const authenticate = async (params: { token: string }): Promise<AuthenticateAPIData> => {
	const { token } = params;
	try {
		const user = jwt.verify(token, config.jwt.secret) as User;
		return { user, valid: true };
	} catch (error) {
		throw new ApiFailure('unauthorized', 'Invalid token');
	}
};
