'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

/** Leaves for `to` when setup is, or is not, needed, as `whenNeeded` says. */
export default function SetupRedirect({ whenNeeded, to }: { whenNeeded: boolean; to: string }) {
	const router = useRouter();

	useEffect(() => {
		api
			.setupStatus()
			.then(({ needed }) => {
				if (needed === whenNeeded) {
					router.replace(to);
				}
			})
			// The form still works, and shows its own error if the API is down.
			.catch(() => undefined);
	}, [router, whenNeeded, to]);

	return null;
}
