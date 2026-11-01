# Browser tests

- These run inside `compose.yml` through `pnpm test:browser`. They address the client as `http://next-client:3000`, so they do not run on the host.
- Test what a user sees through the running system. Do not import from other apps.
- Fake secrets and throwaway data only. Never mount `./media` or `./data` or publish a port.
- The Playwright image tag in `compose.yml` must equal `@playwright/test` in `package.json`.
- `turbo test` must not reach this folder, so it has no `test` script. Browser tests stay out of the required check.
