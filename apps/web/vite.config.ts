import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const apiServer = process.env.API_SERVER_URL ?? 'http://localhost:5000';

export default defineConfig({
	plugins: [
		// Before the React plugin, as its documentation asks.
		tanstackRouter({ target: 'react', autoCodeSplitting: true, quoteStyle: 'single', semicolons: true }),
		react(),
		tailwindcss(),
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
