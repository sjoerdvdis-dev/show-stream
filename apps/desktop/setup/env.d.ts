import type { DesktopBridge } from '../src/bridge';

declare global {
	interface Window {
		/** Given by the preload, to this page only. */
		showStream: DesktopBridge;
	}
}
