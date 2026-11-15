import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

/**
 * The PWA's icon, as `dist/icon.png`, for the window's title bar and task bar on Linux. Windows takes
 * the icon from the executable, which electron-builder gives the same picture.
 */
const windowIcon = (): Plugin => ({
	name: 'window-icon',
	generateBundle() {
		this.emitFile({
			type: 'asset',
			fileName: 'icon.png',
			source: readFileSync(new URL('../web/public/icon-512.png', import.meta.url)),
		});
	},
});

/**
 * The main process and the preload, each as one CommonJS file in `dist`, with everything but
 * Electron and Node's own modules bundled in, so that the app ships no `node_modules`. A sandboxed
 * preload cannot load another file, so it must not share a chunk with the main process.
 */
export default defineConfig({
	plugins: [windowIcon()],
	build: {
		ssr: true,
		target: 'node24',
		outDir: 'dist',
		emptyOutDir: true,
		minify: false,
		rolldownOptions: {
			input: { main: 'src/main.ts', preload: 'src/preload.ts' },
			external: ['electron'],
			output: { format: 'cjs', entryFileNames: '[name].js' },
		},
	},
	ssr: { noExternal: true, external: ['electron'] },
});
