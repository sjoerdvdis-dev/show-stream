import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@workspace/api-client';
import { isUnauthorized } from '@/lib/api';

/** A 4xx answer is final. A failure with no answer, or from the server, may pass. */
const isWorthRetrying = (failures: number, error: unknown) =>
	failures < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500);

/** Every data call goes through these two caches, so a 401 from any of them reaches `onSessionLost`. */
export const createQueryClient = (onSessionLost: () => void) => {
	const onError = (error: unknown) => {
		if (isUnauthorized(error)) {
			onSessionLost();
		}
	};

	return new QueryClient({
		queryCache: new QueryCache({ onError }),
		mutationCache: new MutationCache({ onError }),
		defaultOptions: { queries: { retry: isWorthRetrying } },
	});
};
