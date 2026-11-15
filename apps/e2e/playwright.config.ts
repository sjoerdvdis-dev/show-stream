import { defineConfig, devices } from '@playwright/test';

/** Runs inside the Compose stack in `compose.yml`, so use `pnpm test:browser`. */
export default defineConfig({
	testDir: './tests',
	// Playwright empties this folder, and the parent is a mount point in Compose.
	outputDir: './test-results/output',
	// The tests share one server and one library.
	workers: 1,
	// No retries: these runs are how the suite's reliability is judged.
	retries: 0,
	forbidOnly: true,
	timeout: 60_000,
	reporter: 'list',
	use: {
		// Through Caddy, as a browser reaches a real install. Its internal CA is not trusted here.
		baseURL: 'https://caddy',
		ignoreHTTPSErrors: true,
		// Chromium registers no service worker from an origin whose certificate it does not trust,
		// and `ignoreHTTPSErrors` does not reach the worker's script, so this flag does. A real
		// device trusts Caddy's CA instead, as docs/guides/self-hosting.md says. Set here for every
		// test, because a launch option in one file would move its tests out of file order.
		launchOptions: { args: ['--ignore-certificate-errors'] },
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
