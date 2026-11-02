import { queryOptions } from '@tanstack/react-query';
import { api, isUnauthorized } from '@/lib/api';

/**
 * The signed-in user, or null. Having no session is an answer here rather than an error, so a
 * first visit does not count as a lost session. A user is read once, until the cache is cleared.
 */
export const sessionQuery = queryOptions({
	queryKey: ['session'],
	queryFn: async () => {
		try {
			const { user } = await api.me();
			return user;
		} catch (error) {
			if (isUnauthorized(error)) return null;
			throw error;
		}
	},
	staleTime: ({ state }) => (state.data ? Infinity : 0),
});

/** Asked for fresh each time, because setup can finish in another tab. */
export const setupStatusQuery = queryOptions({
	queryKey: ['setup-status'],
	queryFn: () => api.setupStatus(),
	staleTime: 0,
});
