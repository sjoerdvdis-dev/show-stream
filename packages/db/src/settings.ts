import { eq } from 'drizzle-orm';
import type { Database } from './connection.js';
import { settings } from './schema.js';

export const getSetting = (db: Database, key: string): string | undefined =>
	db.select().from(settings).where(eq(settings.key, key)).get()?.value;

export const setSetting = (db: Database, key: string, value: string): void => {
	db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } }).run();
};
