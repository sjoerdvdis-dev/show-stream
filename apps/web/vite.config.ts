import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const apiServer = process.env.API_SERVER_URL ?? 'http://localhost:5000';

/** Caddy sends the app's Content-Security-Policy, so the policy lives in its Caddyfile. */
const caddyfile = new URL('../../infra/caddy/Caddyfile', import.meta.url);

/**
 * Fails the build unless the policy allows each inline script of the built `index.html` by its
 * hash, so that editing the first-paint script cannot silently stop it from running behind Caddy.
 */
const inlineScriptsInPolicy = (): Plugin => ({
	name: 'inline-scripts-in-policy',
	apply: 'build',
	transformIndexHtml: {
		order: 'post',
		handler(html) {
			const policy = /Content-Security-Policy "([^"]*)"/.exec(readFileSync(caddyfile, 'utf8'))?.[1];
			const scriptSrc = policy
				?.split(';')
				.map((directive) => directive.trim().split(/\s+/))
				.find(([name]) => name === 'script-src');
			if (!scriptSrc) {
				throw new Error('infra/caddy/Caddyfile has no script-src in its Content-Security-Policy.');
			}
			for (const [, script = ''] of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
				const hash = `'sha256-${createHash('sha256').update(script).digest('base64')}'`;
				if (!scriptSrc.includes(hash)) {
					throw new Error(
						`The Content-Security-Policy in infra/caddy/Caddyfile does not allow an inline script of index.html. Put ${hash} in its script-src, in place of the old hash.`,
					);
				}
			}
		},
	},
});

export default defineConfig({
	plugins: [
		// Before the React plugin, as its documentation asks.
		tanstackRouter({ target: 'react', autoCodeSplitting: true, quoteStyle: 'single', semicolons: true }),
		react(),
		tailwindcss(),
		inlineScriptsInPolicy(),
	],
	resolve: { tsconfigPaths: true },
	// hls.js alone is this large, and only the player loads it.
	build: { chunkSizeWarningLimit: 600 },
	server: {
		host: '127.0.0.1',
		// What Caddy does in production. `pnpm dev` is the only place this exists, and it does not
		// reach the build. The `Host` stays as the browser sent it, because the API compares it with
		// `Origin`, so `changeOrigin` must stay off.
		proxy: {
			'/api': { target: apiServer, rewrite: (path) => path.replace(/^\/api/, '') },
			'/socket': { target: apiServer, ws: true },
			'/streams': { target: apiServer },
		},
	},
	test: {
		environment: 'jsdom',
		environmentOptions: { jsdom: { url: 'http://localhost:5173/' } },
		include: ['test/**/*.test.{ts,tsx}'],
		setupFiles: ['test/setup.ts'],
		testTimeout: 30_000,
	},
});
