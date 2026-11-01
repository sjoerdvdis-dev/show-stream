# Browser tests

- These run inside `compose.yml` through `pnpm test:browser`. They address the client as `http://next-client:3000`, so they do not run on the host.
- `fixtures/seed.mjs` runs in the `seed` service after the API has migrated the database, and adds `Demo Movie`, whose video is `fixtures/clip.mp4`, `Missing Video`, which has no video and cannot be prepared, and `Corrupt Movie`, whose `fixtures/corrupt.mp4` fails in the worker.
- Tests run in file order on one server. The first goes through first-run setup, and the rest log in as the owner it creates.
- Test what a user sees through the running system. Do not import from other apps.
- Fake secrets and throwaway data only. Never mount `./media`, `./data` or a real volume, or publish a port.
- The Playwright image tag in `compose.yml` must equal `@playwright/test` in `package.json`.
- `turbo test` must not reach this folder, so it has no `test` script. Browser tests stay out of the required check.
