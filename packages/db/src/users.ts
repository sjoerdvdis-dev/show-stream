import { eq } from 'drizzle-orm';
import type { Database } from './connection.js';
import { users, type User, type UserRole } from './schema.js';

type NewUser = { username: string; passwordHash: string; role?: UserRole };

/** Throws if the username is taken. */
export const createUser = (db: Database, user: NewUser): User => db.insert(users).values(user).returning().get();

/** Leaves an existing account as it is. */
export const createUserIfMissing = (db: Database, user: NewUser): void => {
	db.insert(users).values(user).onConflictDoNothing({ target: users.username }).run();
};

export const findUserByUsername = (db: Database, username: string): User | undefined =>
	db.select().from(users).where(eq(users.username, username)).get();
