import { queryOptions } from '@tanstack/react-query';
import type { Scan } from '@workspace/contract/api-types';
import { api } from '@/lib/api';

/** How often the latest scan is asked for while it is queued or running. Nothing else polls. */
const refreshWhileActiveMs = 1000;

/** Whether a scan is queued or running, so that it has no result yet. */
export const isActive = (scan: Scan | null | undefined) => scan?.status === 'queued' || scan?.status === 'running';

/** The latest scan, asked for again every second while it is active, and not otherwise. */
export const scanQuery = queryOptions({
	queryKey: ['scan'],
	queryFn: () => api.scanStatus(),
	refetchInterval: ({ state }) => (isActive(state.data?.scan) ? refreshWhileActiveMs : false),
});
