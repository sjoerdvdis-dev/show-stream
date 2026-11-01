import { eq } from 'drizzle-orm';
import type { Database } from './connection.js';
import { users, type User, type UserRole } from './schema.js';

type NewUser = { username: string; passwordHash: string; role?: UserRole };

/** Throws if the username is taken. */
export const createUser = (db: Database, user: NewUser): User => db.insert(users).values(user).returning().all()[0]!;

/**
 * Creates the one owner, as a single atomic step. Returns nothing if an owner exists already
 * or the username is taken.
 */
export const createOwner = (db: Database, owner: Omit<NewUser, 'role'>): User | undefined =>
	db
		.insert(users)
		.values({ ...owner, role: 'owner' })
		.onConflictDoNothing()
		.returning()
		.all()[0];

export const hasOwner = (db: Database): boolean =>
	db.select({ id: users.id }).from(users).where(eq(users.role, 'owner')).get() !== undefined;

export const findUserByUsername = (db: Database, username: string): User | undefined =>
	db.select().from(users).where(eq(users.username, username)).get();
