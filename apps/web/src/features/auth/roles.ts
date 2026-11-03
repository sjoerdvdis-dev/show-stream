import type { User } from '@workspace/contract/api-types';

/**
 * Whether the user may scan the library, as an owner or admin. It mirrors `isAdmin` in
 * `apps/api/src/auth.ts`, and is only for the user's experience: the API refuses anyone else.
 */
export const canManageLibrary = (user: Pick<User, 'role'>) => user.role === 'owner' || user.role === 'admin';
