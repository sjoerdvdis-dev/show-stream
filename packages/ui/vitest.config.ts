import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		projects: [
			{
				extends: true,
				test: { name: 'tokens', include: ['test/*.test.ts'], environment: 'node' },
			},
			{
				extends: true,
				test: {
					name: 'components',
					include: ['test/components/**/*.test.tsx'],
					environment: 'jsdom',
					setupFiles: ['test/components/setup.ts'],
				},
			},
		],
	},
});
