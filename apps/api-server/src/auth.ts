import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ensureDbConnection, UserModel } from './db';
import { AuthenticateAPIData, BaseAPIResponse, LoginAPIData, RegisterAPIData, User } from '@workspace/types/api-types';

/**
 * Authentication API
 * - Register user with user/password
 * - Sign-in with user/password -> JWT
 * - JWT verification
 * - JWT refresh
 */

// POST /register (TEMP)
export const register = async (params: {
	username: string;
	password: string;
}): Promise<BaseAPIResponse & { data?: RegisterAPIData }> => {
	const { username, password } = params;

	if (!ensureDbConnection()) {
		return { status: 500, error: 'Registration failed' };
	}

	try {
		const hashedPassword = await bcrypt.hash(password, 10);
		const user = new UserModel({ username, password: hashedPassword });
		await user.save();
		return { status: 201, data: { success: true } };
	} catch (error) {
		return { status: 500, error: 'Registration failed' };
	}
};

// POST /login
export const login = async (params: {
	username: string;
	password: string;
}): Promise<BaseAPIResponse & { data?: LoginAPIData }> => {
	const { username, password } = params;

	if (!ensureDbConnection()) {
		return { status: 500, error: 'Server could not login' };
	}

	try {
		const user = await UserModel.findOne({ username }).lean();
		if (!user) {
			return { status: 401, error: 'Login failed' };
		}

		const passwordMatch = await bcrypt.compare(password, user.password);

		if (!passwordMatch) {
			return { status: 401, error: 'Login failed' };
		}

		const userData: User = { userId: String(user._id), username: user.username };

		const token = jwt.sign(userData, process.env.JWT_SECRET as string, {
			expiresIn: Number(process.env.JWT_EXPIRES_IN),
		});

		return { status: 200, data: { token } };
	} catch (error) {
		return { status: 401, error: 'Login failed' };
	}
};

// POST /authenticate
export const authenticate = async (params: {
	token: string;
}): Promise<BaseAPIResponse & { data?: AuthenticateAPIData }> => {
	const { token } = params;
	try {
		const user = jwt.verify(token, process.env.JWT_SECRET as string) as User | undefined;
		if (!user) {
			return { status: 401 };
		}
		return { status: 200, data: { user, valid: true } };
	} catch (error) {
		return { status: 401 };
	}
};
