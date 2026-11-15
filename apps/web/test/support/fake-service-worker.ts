import type { RegisterSWOptions } from 'virtual:pwa-register';

/**
 * The service worker, which jsdom does not have, as `vite-plugin-pwa`'s `registerSW` reports it.
 * `test/setup.ts` puts `registerSW` in place of the plugin's.
 */
export const fakeServiceWorker = {
	options: undefined as RegisterSWOptions | undefined,
	/** How many times the app asked the waiting version to take over. */
	skipWaitingRequests: 0,
	/** A new version is installed, and waits. */
	waiting() {
		this.options?.onNeedRefresh?.();
	},
	/** The new version took over, after Reload in this tab or in another. */
	controlling() {
		this.options?.onNeedReload?.();
	},
};

export const registerSW = (options: RegisterSWOptions) => {
	fakeServiceWorker.options = options;
	return async () => {
		fakeServiceWorker.skipWaitingRequests += 1;
	};
};

export const resetFakeServiceWorker = () => {
	fakeServiceWorker.options = undefined;
	fakeServiceWorker.skipWaitingRequests = 0;
};
