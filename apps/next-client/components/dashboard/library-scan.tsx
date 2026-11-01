'use client';

import type { Scan, ScanAPIData, ScanCounts } from '@workspace/contract/api-types';
import { ApiError } from '@workspace/api-client';
import { Button } from '@workspace/ui/components/button';
import { toast } from 'sonner';
import useSWR from 'swr';
import { api, fetcher, isSessionEnded, returnToLogin } from '@/lib/api';

const refreshWhileActiveMs = 1000;

const isActive = (scan?: Scan | null) => scan?.status === 'queued' || scan?.status === 'running';

const countLabels: [keyof ScanCounts, string][] = [
	['found', 'Found'],
	['added', 'Added'],
	['updated', 'Updated'],
	['unmatched', 'Unmatched'],
	['failed', 'Failed'],
];

const headline = ({ status, time }: Scan) => {
	const when = new Date(time).toLocaleString();
	return {
		queued: 'The scan is waiting for the worker.',
		running: 'Scanning the library.',
		done: `Last scan finished ${when}.`,
		failed: `Last scan failed ${when}.`,
	}[status];
};

function ScanResult({ scan }: { scan: Scan }) {
	const { counts, error, errors } = scan;
	const hidden = counts.unmatched + counts.failed - errors.length;
	const finished = !isActive(scan);

	return (
		<div className="flex flex-col gap-2 text-sm">
			<p role="status">{headline(scan)}</p>
			{error && (
				<p role="alert" className="text-destructive break-words">
					{error}
				</p>
			)}
			{finished && (
				<dl className="flex flex-wrap gap-x-6 gap-y-1">
					{countLabels.map(([key, label]) => (
						<div key={key} className="flex gap-1">
							<dt className="text-muted-foreground">{label}</dt>
							<dd>{counts[key]}</dd>
						</div>
					))}
				</dl>
			)}
			{errors.length > 0 && (
				<ul aria-label="Scan problems" className="flex flex-col gap-1 text-muted-foreground">
					{errors.map((problem) => (
						<li key={problem} className="break-words">
							{problem}
						</li>
					))}
					{hidden > 0 && <li>{`And ${hidden} more.`}</li>}
				</ul>
			)}
		</div>
	);
}

/** Starts a library scan and shows the latest result. Only an admin sees this, and the API enforces it. */
export function LibraryScan() {
	const { data, mutate } = useSWR<ScanAPIData>('/api/scan', fetcher, {
		refreshInterval: (latest) => (isActive(latest?.scan) ? refreshWhileActiveMs : 0),
	});
	const scan = data?.scan;

	const startScan = async () => {
		try {
			await mutate(await api.scan(), { revalidate: false });
		} catch (error) {
			if (isSessionEnded(error)) {
				returnToLogin();
				return;
			}
			if (error instanceof ApiError && error.status === 409) {
				await mutate();
				return;
			}
			toast.error('Could not start a scan. Try again.', { closeButton: true });
		}
	};

	return (
		<section aria-label="Library scan" className="flex flex-col items-start gap-3 max-w-2xl">
			<h2 className="text-lg font-semibold">Library</h2>
			<Button onClick={startScan} disabled={isActive(scan)}>
				Scan library
			</Button>
			{scan ? <ScanResult scan={scan} /> : <p className="text-sm text-muted-foreground">No scan has run yet.</p>}
		</section>
	);
}
