import { eq, lte } from 'drizzle-orm';
import type { Database } from './connection.js';
import { sessions, users, type Session, type User } from './schema.js';

/** A session with its user. The password hash stays out of it. */
export type SessionWithUser = Session & { user: Pick<User, 'id' | 'username' | 'role'> };

export const createSession = (db: Database, session: Session): void => {
	db.insert(sessions).values(session).run();
};

/** Finds a session by primary key, so that a check on every video segment stays cheap. */
export const findSession = (db: Database, id: string): SessionWithUser | undefined =>
	db
		.select({
			id: sessions.id,
			userId: sessions.userId,
			expiresAt: sessions.expiresAt,
			user: { id: users.id, username: users.username, role: users.role },
		})
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(eq(sessions.id, id))
		.get();

export const extendSession = (db: Database, id: string, expiresAt: Date): void => {
	db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id)).run();
};

export const deleteSession = (db: Database, id: string): void => {
	db.delete(sessions).where(eq(sessions.id, id)).run();
};

export const deleteExpiredSessions = (db: Database, now: Date): void => {
	db.delete(sessions).where(lte(sessions.expiresAt, now)).run();
};
