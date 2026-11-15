import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Chromium refuses a module script with `crossorigin` from a `file:` page, which has no origin to
 * share, and the setup page is a file.
 */
const withoutCrossorigin = (): Plugin => ({
	name: 'without-crossorigin',
	apply: 'build',
	transformIndexHtml: { order: 'post', handler: (html) => html.replaceAll(' crossorigin', '') },
});

/** The setup page, the app's only local page, built into `dist/setup` with relative paths. */
export default defineConfig({
	root: 'setup',
	base: './',
	plugins: [react(), tailwindcss(), withoutCrossorigin()],
	build: { outDir: '../dist/setup', emptyOutDir: true, modulePreload: false },
	test: {
		root: '.',
		include: ['test/**/*.test.ts'],
		environment: 'node',
	},
});
