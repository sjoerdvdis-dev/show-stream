import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import type { CookieOptions, Request, Response } from 'express';
import { config } from './config';
import { db } from './db';
import { ApiFailure } from './errors';
import { disconnectSession } from './notification';
import {
	createOwner,
	createSession,
	deleteExpiredSessions,
	deleteSession,
	extendSession,
	findSession,
	findUserByUsername,
	hasOwner,
	type SessionWithUser,
	type User,
} from '@workspace/db';
import type { LogoutAPIData, SessionAPIData, SetupStatusAPIData } from '@workspace/contract/api-types';

/**
 * Authentication API
 * Sessions are random tokens in a cookie, and the database holds only their hashes.
 */

export type Session = Pick<SessionWithUser, 'id' | 'user'>;

const passwordRounds = 10;
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;
/** `/streams` checks the session on every segment, and most of those checks must not write. */
const extendEveryMs = 60 * 60 * 1000;

const cookieName = 'session';
const cookieOptions: CookieOptions = {
	httpOnly: true,
	sameSite: 'lax',
	secure: config.sessionCookieSecure,
	path: '/',
};

/** Compared when a username is unknown, so that its timing matches a wrong password. */
const decoyPasswordHash = bcrypt.hashSync(randomUUID(), passwordRounds);

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const readToken = (cookieHeader = '') =>
	cookieHeader
		.split(';')
		.map((cookie) => cookie.trim())
		.find((cookie) => cookie.startsWith(`${cookieName}=`))
		?.slice(cookieName.length + 1);

const setSessionCookie = (res: Response, token: string) => {
	res.cookie(cookieName, token, { ...cookieOptions, maxAge: sessionLifetimeMs });
};

const nextExpiry = () => new Date(Date.now() + sessionLifetimeMs);

const startSession = (res: Response, user: Pick<User, 'id' | 'username' | 'role'>): SessionAPIData => {
	const token = randomBytes(32).toString('hex');
	createSession(db, { id: hashToken(token), userId: user.id, expiresAt: nextExpiry() });
	setSessionCookie(res, token);
	return toSessionData({ user });
};

const toSessionData = ({ user }: Pick<Session, 'user'>): SessionAPIData => ({
	user: { userId: String(user.id), username: user.username, role: user.role },
});

/** The live session a cookie belongs to. An expired one is removed. */
const findActiveSession = (token: string | undefined) => {
	const session = token ? findSession(db, hashToken(token)) : undefined;
	if (session && session.expiresAt.getTime() <= Date.now()) {
		deleteSession(db, session.id);
		return undefined;
	}
	return session;
};

/** For the socket handshake, which has no response to carry a new cookie. */
export const findSessionOfHandshake = (headers: IncomingHttpHeaders): Session | undefined =>
	findActiveSession(readToken(headers.cookie));

/** The session of a request. Extends it at most once per `extendEveryMs`. */
export const findSessionOfRequest = (req: Request, res: Response): Session | undefined => {
	const token = readToken(req.headers.cookie);
	const session = findActiveSession(token);
	if (!session || !token) {
		return undefined;
	}
	if (session.expiresAt.getTime() - Date.now() < sessionLifetimeMs - extendEveryMs) {
		extendSession(db, session.id, nextExpiry());
		setSessionCookie(res, token);
	}
	return session;
};

export const isAdmin = ({ user }: Session) => user.role === 'owner' || user.role === 'admin';

export const removeExpiredSessions = () => {
	deleteExpiredSessions(db, new Date());
};

/** Failed attempts only, so that normal use never reaches the limit. */
export const passwordAttemptLimit = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	skipSuccessfulRequests: true,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	handler: (_req, _res, next) => {
		next(new ApiFailure('rate_limited', 'Too many attempts. Try again later'));
	},
});

/**
 * Whether an `Origin` differs from the host the browser asked for, which is the proxy's
 * `X-Forwarded-Host` when there is one. A request with no `Origin` did not come from a page
 * on another site, because browsers send it on every cross-site request this is used for.
 */
export const isCrossSite = ({ origin, host, 'x-forwarded-host': forwardedHost }: IncomingHttpHeaders) => {
	if (!origin) {
		return false;
	}
	const requestedHost = [forwardedHost].flat().at(-1)?.split(',').at(-1)?.trim() || host;
	return !URL.canParse(origin) || new URL(origin).host !== requestedHost?.toLowerCase();
};

// GET /auth/setup
export const setupStatus = async (): Promise<SetupStatusAPIData> => ({ needed: !hasOwner(db) });

const setupFinished = () => new ApiFailure('conflict', 'Setup has already been completed');

// POST /auth/setup
export const setup = async (
	params: { username: string; password: string },
	res: Response,
): Promise<SessionAPIData> => {
	const { username, password } = params;

	if (hasOwner(db)) {
		throw setupFinished();
	}

	const owner = createOwner(db, { username, passwordHash: await bcrypt.hash(password, passwordRounds) });
	if (!owner) {
		// An upgraded install can have other accounts, and no owner yet.
		throw hasOwner(db) ? setupFinished() : new ApiFailure('conflict', 'That username is taken');
	}

	return startSession(res, owner);
};

// POST /auth/login
export const login = async (
	params: { username: string; password: string },
	res: Response,
): Promise<SessionAPIData> => {
	const { username, password } = params;

	const user = findUserByUsername(db, username);
	const passwordMatch = await bcrypt.compare(password, user?.passwordHash ?? decoyPasswordHash);

	if (!user || !passwordMatch) {
		throw new ApiFailure('unauthorized', 'Invalid username or password');
	}

	return startSession(res, user);
};

// POST /auth/logout
export const logout = async (session: Session, res: Response): Promise<LogoutAPIData> => {
	deleteSession(db, session.id);
	disconnectSession(session.id);
	res.clearCookie(cookieName, cookieOptions);
	return { success: true };
};

// GET /auth/me
export const me = async (session: Session): Promise<SessionAPIData> => toSessionData(session);
