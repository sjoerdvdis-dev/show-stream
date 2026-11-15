import { defineConfig } from 'vite';

/**
 * The main process and the preload, each as one CommonJS file in `dist`, with everything but
 * Electron and Node's own modules bundled in, so that the app ships no `node_modules`. A sandboxed
 * preload cannot load another file, so it must not share a chunk with the main process.
 */
export default defineConfig({
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
