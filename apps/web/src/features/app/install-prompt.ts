import { useSyncExternalStore } from 'react';

/** Chromium's install prompt, which no TypeScript library describes yet. */
type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<unknown>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type InstallState =
	/** Running as the installed app. */
	| 'standalone'
	/** Installed from this page just now. */
	| 'installed'
	/** The browser offered to install, so Install can ask it to. */
	| 'available'
	/** The browser has not offered, or never does, as Safari and Firefox. */
	| 'manual';

let prompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let listening: AbortController | undefined;
const listeners = new Set<() => void>();

const changed = () => {
	for (const listener of listeners) listener();
};

/**
 * Keeps the browser's install prompt for Settings. It can fire as soon as the page loads, before
 * Settings is open, so this starts with the page, in `main.tsx`.
 */
export const listenForInstallPrompt = () => {
	listening?.abort();
	listening = new AbortController();
	prompt = null;
	installed = false;
	const { signal } = listening;

	window.addEventListener(
		'beforeinstallprompt',
		(event) => {
			// Keeps the browser's own banner away, because Settings offers Install.
			event.preventDefault();
			prompt = event as BeforeInstallPromptEvent;
			changed();
		},
		{ signal },
	);
	window.addEventListener(
		'appinstalled',
		() => {
			prompt = null;
			installed = true;
			changed();
		},
		{ signal },
	);
};

const isStandalone = () =>
	window.matchMedia('(display-mode: standalone)').matches === true ||
	(navigator as Navigator & { standalone?: boolean }).standalone === true;

const readState = (): InstallState => {
	if (isStandalone()) return 'standalone';
	if (installed) return 'installed';
	return prompt ? 'available' : 'manual';
};

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};

/** Shows the browser's install dialog. A prompt can be used once, so it is gone afterwards. */
const install = async () => {
	const current = prompt;
	if (!current) return;
	prompt = null;
	await current.prompt();
	const { outcome } = await current.userChoice;
	installed = outcome === 'accepted';
	changed();
};

export const useInstallPrompt = () => ({ state: useSyncExternalStore(subscribe, readState), install });
