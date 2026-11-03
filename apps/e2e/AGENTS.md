# Browser tests

- These run inside `compose.yml` through `pnpm test:browser`. They drive `apps/web` as `https://caddy`, through the Caddy image that ships, built from `apps/web/Dockerfile` with the app and the Caddyfile inside, in `internal` mode, so they do not run on the host. Playwright ignores the certificate, and everything else is as real as a browser sees it.
- `tests/proxy.spec.ts` sorts after `flow.spec.ts` on purpose: it needs the owner and the prepared movie, and its last test uses up the login limit. Caddy serves the app's files itself and sends the rest to the API, so an answer is Caddy's or the API's, with no Node server between. It also checks the caching and security headers, and that the app runs under its `Content-Security-Policy` with no violation in the console.
- `fixtures/seed.mjs` runs in the `seed` service after the API has migrated the database, and adds `Demo Movie`, whose video is `fixtures/clip.mp4`, `Missing Video`, which has no video and cannot be prepared, and `Corrupt Movie`, whose `fixtures/corrupt.mp4` fails in the worker.
- `fixtures/fake-tmdb.mjs` loads into the worker through `NODE_OPTIONS`, and answers for the folders in `compose.yml`. A new folder a scan should find goes in both.
- Tests run in file order on one server, and later tests rely on what earlier ones left: the failed and ready titles, then the scan's art. The first goes through first-run setup, and the rest log in as the owner it creates.
- Test what a user sees through the running system. Do not import from other apps.
- `run.sh` plants fake env files in the build context and, after the tests, reads every file of each image for them. A file in that list must be one `.dockerignore` excludes, so never add a tracked default.
- Fake secrets and throwaway data only. Never mount `./media`, `./data` or a real volume, or publish a port.
- The Playwright image tag in `compose.yml` must equal `@playwright/test` in `package.json`. The health check commands must equal those in `docker-compose.yml`. Caddy's tag lives only in `apps/web/Dockerfile`, which both Compose files build.
- Select by role and name, as a user finds things, from `apps/web`'s labels: `Play Demo Movie`, the `Notifications` region for toasts, a region per Settings section.
- `turbo test` must not reach this folder, so it has no `test` script. Browser tests stay out of the required check.
