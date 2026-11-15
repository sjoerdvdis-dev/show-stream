import { readFileSync } from 'node:fs';
import { formatHex, parse } from 'culori';
import type { Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** The design tokens, whose values live only here. DESIGN.md names their roles. */
const tokens = new URL('../../packages/ui/src/styles/tokens.css', import.meta.url);

/** A variable of one theme block, `:root` or `.dark`, as hex, because a manifest takes no OKLCH. */
const tokenColor = (block: ':root' | '.dark', name: string) => {
	const css = readFileSync(tokens, 'utf8');
	const body = new RegExp(`^${block.replace('.', '\\.')} \\{([^}]*)\\}`, 'm').exec(css)?.[1];
	const value = body && new RegExp(`--${name}:\\s*([^;]+);`).exec(body)?.[1];
	const hex = value ? formatHex(parse(value)) : undefined;
	if (!hex) {
		throw new Error(`packages/ui/src/styles/tokens.css has no --${name} in its ${block} block.`);
	}
	return hex;
};

/**
 * The page's `background` in each theme. The manifest takes one value, so it uses the dark theme's,
 * as the direction is dark first. The `theme-color` meta tag follows the theme in use.
 */
export const themeColors = { dark: tokenColor('.dark', 'background'), light: tokenColor(':root', 'background') };

/** Fills the `theme-color` meta tag of `index.html` with the token's values. */
export const themeColorMeta = (): Plugin => ({
	name: 'theme-color-meta',
	transformIndexHtml: {
		order: 'pre',
		handler: (html) =>
			html.replaceAll('%THEME_COLOR_DARK%', themeColors.dark).replaceAll('%THEME_COLOR_LIGHT%', themeColors.light),
	},
});

/** Paths the server answers, which the service worker must never touch, nor send to the app. */
const serverPaths = [/^\/api(\/|$)/, /^\/socket(\/|$)/, /^\/streams(\/|$)/];

/**
 * The manifest and a Workbox service worker that precaches the app shell and nothing else. The app
 * registers it, in `src/lib/app-update.ts`, and asks before a new version takes over.
 *
 * `pnpm dev` leaves it off, so that a stale worker never hides a change. `PWA_DEV=true pnpm dev`
 * turns it on.
 */
export const pwa = () =>
	VitePWA({
		registerType: 'prompt',
		// The app registers the worker itself, through `virtual:pwa-register`.
		injectRegister: false,
		manifestFilename: 'manifest.webmanifest',
		// The glob below finds the icons already.
		includeManifestIcons: false,
		manifest: {
			// The identity of the installed app. Changing it would install a second one.
			id: '/',
			name: 'ShowStream',
			short_name: 'ShowStream',
			description: 'Your self-hosted movie library.',
			start_url: '/',
			scope: '/',
			display: 'standalone',
			theme_color: themeColors.dark,
			background_color: themeColors.dark,
			icons: [
				{ src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
				{ src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
				{ src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
			],
		},
		workbox: {
			// The shell: the page, its hashed scripts, styles and fonts, and the icons. The plugin adds the manifest.
			globPatterns: ['**/*.{html,js,css,woff2,png,svg,ico}'],
			// A page load anywhere in the app gets the shell, which routes it. The server's own paths
			// go to the network as they always did.
			navigateFallback: '/index.html',
			navigateFallbackDenylist: serverPaths,
			// No runtime caching: API answers, art and streams always come from the server.
			runtimeCaching: [],
			cleanupOutdatedCaches: true,
			// The worker waits until the user chooses Reload.
			skipWaiting: false,
			clientsClaim: false,
		},
		devOptions: {
			enabled: process.env.PWA_DEV === 'true',
			navigateFallback: 'index.html',
			navigateFallbackAllowlist: [/^\/(?!api|socket|streams)/],
		},
	});
