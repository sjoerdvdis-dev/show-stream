# Browser tests

- These run inside `compose.yml` through `pnpm test:browser`. They address the system as `https://caddy`, through the shipped Caddyfile in `internal` mode, so they do not run on the host. Playwright ignores the certificate, and everything else is as real as a browser sees it.
- `tests/proxy.spec.ts` sorts after `flow.spec.ts` on purpose: it needs the owner and the prepared movie, and its last test uses up the login limit. A built Next client has no route to the API, so an answer from the API proves that no hop went through Next.
- `fixtures/seed.mjs` runs in the `seed` service after the API has migrated the database, and adds `Demo Movie`, whose video is `fixtures/clip.mp4`, `Missing Video`, which has no video and cannot be prepared, and `Corrupt Movie`, whose `fixtures/corrupt.mp4` fails in the worker.
- `fixtures/fake-tmdb.mjs` loads into the worker through `NODE_OPTIONS`, and answers for the folders in `compose.yml`. A new folder a scan should find goes in both.
- Tests run in file order on one server. The first goes through first-run setup, and the rest log in as the owner it creates.
- Test what a user sees through the running system. Do not import from other apps.
- Fake secrets and throwaway data only. Never mount `./media`, `./data` or a real volume, or publish a port.
- The Playwright image tag in `compose.yml` must equal `@playwright/test` in `package.json`, and the Caddy tag must equal the one in `docker-compose.yml`.
- `turbo test` must not reach this folder, so it has no `test` script. Browser tests stay out of the required check.
