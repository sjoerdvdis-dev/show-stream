/**
 * What the window does with a URL a page tries to open:
 *
 * - `stay`: it is on the chosen server, so it loads in the window.
 * - `external`: any other `https:` link, which opens in the system browser.
 * - `deny`: anything else, such as `http:`, `file:`, `javascript:` or a custom scheme, and every
 *   URL while no server is chosen, except `https:` links, which still open externally.
 */
export type NavigationRule = 'stay' | 'external' | 'deny';

export const navigationRule = (target: string, serverOrigin: string | undefined): NavigationRule => {
	if (!URL.canParse(target)) {
		return 'deny';
	}
	const url = new URL(target);
	if (serverOrigin !== undefined && url.origin === serverOrigin) {
		return 'stay';
	}
	if (url.protocol === 'https:' && !url.username && !url.password) {
		return 'external';
	}
	return 'deny';
};
