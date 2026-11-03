import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@workspace/api-client';
import type { Scan, ScanCounts } from '@workspace/contract/api-types';
import { Button } from '@workspace/ui/components/button';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { SettingsSection } from '@workspace/ui/patterns/settings';
import { ErrorState, LoadingStatus } from '@workspace/ui/patterns/states';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { libraryKey } from '@/features/library/use-library-list';
import { api, isUnauthorized } from '@/lib/api';

/** How often the latest scan is asked for while it is queued or running. Nothing else polls. */
const refreshWhileActiveMs = 1000;

const isActive = (scan: Scan | null | undefined) => scan?.status === 'queued' || scan?.status === 'running';

/** The latest scan, asked for again every second while it is active, and not otherwise. */
export const scanQuery = queryOptions({
	queryKey: ['scan'],
	queryFn: () => api.scanStatus(),
	refetchInterval: ({ state }) => (isActive(state.data?.scan) ? refreshWhileActiveMs : false),
});

const countLabels: [keyof ScanCounts, string][] = [
	['found', 'Found'],
	['added', 'Added'],
	['updated', 'Updated'],
	['unmatched', 'Unmatched'],
	['failed', 'Failed'],
];

const formatTime = (time: string) =>
	new Date(time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const statusText: Record<Scan['status'], string> = {
	queued: 'The scan is waiting for the worker.',
	running: 'Scanning the library.',
	done: 'Last scan finished',
	failed: 'Last scan failed',
};

/** What the latest scan did: its status and time, why it failed, its counts and the folders it could not add. */
const ScanResult = ({ scan }: { scan: Scan }) => {
	const { counts, error, errors } = scan;
	// The API caps the list of problems, and the counts keep the true totals.
	const unlisted = counts.unmatched + counts.failed - errors.length;
	const active = isActive(scan);

	return (
		<div className="flex flex-col gap-3">
			<p role="status">
				{active ? (
					<span>{statusText[scan.status]}</span>
				) : (
					<span>
						{statusText[scan.status]} <time dateTime={scan.time}>{formatTime(scan.time)}</time>.
					</span>
				)}
			</p>
			{error ? <p className="break-words text-destructive">{error}</p> : null}
			{active ? null : (
				<dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
					{countLabels.map(([key, label]) => (
						<div key={key} className="flex flex-col rounded-lg bg-muted px-3 py-2">
							<dt className="text-xs text-muted-foreground">{label}</dt>
							<dd className="font-mono text-lg tabular-nums">{counts[key]}</dd>
						</div>
					))}
				</dl>
			)}
			{errors.length > 0 ? (
				<div className="flex flex-col gap-1">
					<p className="font-medium">Problems</p>
					<ul aria-label="Scan problems" className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
						{errors.map((problem) => (
							<li key={problem} className="break-words">
								{problem}
							</li>
						))}
						{unlisted > 0 ? <li>{`And ${unlisted} more.`}</li> : null}
					</ul>
				</div>
			) : null}
		</div>
	);
};

/**
 * Scan library, for an owner or admin, and what the latest scan did. The API refuses anyone else.
 * When a scan ends, the library is asked for again, so that the new titles show.
 */
export const LibrarySection = () => {
	const queryClient = useQueryClient();
	const { data, error, isPending, refetch } = useQuery(scanQuery);
	const scan = data?.scan;
	const active = isActive(scan);

	const start = useMutation({
		mutationFn: () => api.scan(),
		onSuccess: (result) => queryClient.setQueryData(scanQuery.queryKey, result),
		onError: (startError) => {
			if (isUnauthorized(startError)) return;
			// Another tab or admin started one, which the latest scan now shows.
			if (startError instanceof ApiError && startError.code === 'conflict') {
				void queryClient.invalidateQueries({ queryKey: scanQuery.queryKey });
				return;
			}
			toast.error('Could not start a scan.', { description: startError.message, closeButton: true });
		},
	});

	const wasActiveRef = useRef(active);
	useEffect(() => {
		if (wasActiveRef.current && !active) void queryClient.invalidateQueries({ queryKey: libraryKey });
		wasActiveRef.current = active;
	}, [active, queryClient]);

	const busy = active || start.isPending;

	return (
		<SettingsSection
			title="Library"
			description="A scan adds the movies in the media folder, and updates the ones it has."
		>
			<Button
				className="w-fit"
				disabled={busy || isPending}
				aria-busy={busy || undefined}
				onClick={() => start.mutate()}
			>
				{busy ? (
					<LoaderCircle aria-hidden="true" data-icon="inline-start" className="motion-safe:animate-spin" />
				) : (
					<RefreshCw aria-hidden="true" data-icon="inline-start" />
				)}
				Scan library
			</Button>
			{error ? (
				<ErrorState
					className="py-4"
					title="Could not load the latest scan"
					description={error.message}
					onRetry={() => void refetch()}
				/>
			) : isPending ? (
				<LoadingStatus label="Loading the latest scan" className="flex flex-col gap-2">
					<Skeleton className="h-4 w-2/3" />
					<Skeleton className="h-16 w-full" />
				</LoadingStatus>
			) : scan ? (
				<ScanResult scan={scan} />
			) : (
				<p className="text-muted-foreground">No scan has run yet.</p>
			)}
		</SettingsSection>
	);
};
