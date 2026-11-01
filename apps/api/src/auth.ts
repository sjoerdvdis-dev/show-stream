import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { requireDbConnection, UserModel } from './db';
import { ApiFailure } from './errors';
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

	await requireDbConnection();

	const hashedPassword = await bcrypt.hash(password, 10);
	const user = new UserModel({ username, password: hashedPassword });
	await user.save();
	return { success: true };
};

// Creates the TEMP account on first start. It exists on every later start.
export const ensureDefaultUser = async () => {
	if (!(await UserModel.exists({ username: 'admin' }))) {
		await register({ username: 'admin', password: 'admin' });
	}
};

const loginFailed = () => new ApiFailure('unauthorized', 'Invalid username or password');

// POST /login
export const login = async (params: { username: string; password: string }): Promise<LoginAPIData> => {
	const { username, password } = params;

	await requireDbConnection();

	const user = await UserModel.findOne({ username }).lean();
	if (!user) {
		throw loginFailed();
	}

	const passwordMatch = await bcrypt.compare(password, user.password);

	if (!passwordMatch) {
		throw loginFailed();
	}

	const userData: User = { userId: String(user._id), username: user.username };

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
