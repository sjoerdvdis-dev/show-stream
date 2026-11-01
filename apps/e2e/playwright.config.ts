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
		// The address the API's CORS setting and the client's image expect.
		baseURL: 'http://next-client:3000',
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
