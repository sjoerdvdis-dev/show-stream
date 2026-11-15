import { useRouterState } from '@tanstack/react-router';
import { useEffect, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { registerSW } from 'virtual:pwa-register';

/**
 * `waiting`: a new version is installed and waits for Reload. `active`: Reload in another tab
 * already let it take over, so this tab only has to load it.
 */
type UpdateState = 'none' | 'waiting' | 'active';

const hour = 60 * 60 * 1000;
const toastId = 'app-update';

let state: UpdateState = 'none';
let reloadAsked = false;
let applyUpdate: (() => Promise<void>) | undefined;
const listeners = new Set<() => void>();

const setState = (next: UpdateState) => {
	state = next;
	for (const listener of listeners) listener();
};

/**
 * Registers the service worker, once per page load. A new version waits until the user chooses
 * Reload. The plugin would reload every tab once the new worker takes over, so this takes that
 * over too: only the tab where Reload was chosen reloads, and a movie playing in another is
 * never cut off.
 */
export const registerServiceWorker = () => {
	state = 'none';
	reloadAsked = false;
	applyUpdate = registerSW({
		onNeedRefresh: () => setState('waiting'),
		onNeedReload: () => {
			if (reloadAsked) {
				window.location.reload();
			} else {
				setState('active');
			}
		},
		// An installed app can stay open for days without a page load to look for a new version.
		onRegisteredSW: (_url, registration) => {
			if (registration) {
				setInterval(() => void registration.update().catch(() => {}), hour);
			}
		},
	});
};

/** Lets the waiting version take over, which reloads this tab. */
const reload = () => {
	if (state === 'active' || !applyUpdate) {
		window.location.reload();
		return;
	}
	reloadAsked = true;
	void applyUpdate();
};

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};

/**
 * Offers a new version with Reload, and never reloads by itself. On the player the offer waits
 * until the user leaves it.
 */
export const AppUpdateToast = () => {
	const update = useSyncExternalStore(subscribe, () => state);
	const watching = useRouterState({ select: ({ location }) => location.pathname.startsWith('/watch/') });

	useEffect(() => {
		if (update === 'none') return;
		if (watching) {
			toast.dismiss(toastId);
			return;
		}
		toast('A new version of ShowStream is ready.', {
			id: toastId,
			description: 'Reload to use it.',
			duration: Infinity,
			action: { label: 'Reload', onClick: reload },
		});
	}, [update, watching]);

	return null;
};
