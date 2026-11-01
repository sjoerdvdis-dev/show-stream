# API

These rules are the target. Phase 1 brings the existing routes in line, so apply them to every route you add or change.

- Every route is an endpoint in `@workspace/contract` with a handler in `src/index.ts`. `createServer` keeps the Express app private, so there is no other way to add one, and `bindRoutes` validates before the handler runs.
- Every route requires a session unless its contract endpoint says `access: 'public'`, and `access: 'admin'` also requires a role. `bindRoutes` enforces this before validation, so no handler checks auth itself.
- `test/protected-routes.test.ts` reads the contract, so a new endpoint is covered by itself. Adding a public endpoint means changing the allowlist in that test.
- Sockets go through the same session check at the handshake. Send events to rooms with `notifyUsers`, never to all sockets.
- Every error uses the one error shape in the contract. Throw `ApiFailure` for what the client should see, and anything else for the central handler to log and hide.
- Only `src/config.ts` reads the environment.
- The database is reached only through `@workspace/db`, with the `db` from `src/db.ts`. Never import Drizzle or `better-sqlite3`.
- ffmpeg belongs in the worker, and this image has none. The API queues transcodes and reads their state in `@workspace/db`, and SQLite is the only link between the two.

## Tests

- Tests start the real API and a real worker through `test/support/api.ts`, and use only HTTP. They do not import from `src`.
- To catch a job partway, use `holdFfmpeg` in `test/support/ffmpeg.ts`. The worker's `ffmpeg` in tests is `test/support/ffmpeg-shim/ffmpeg`, which runs the real one unless a title is held.
- `api.createOwner()` runs setup and returns a client with a session. Everything on `api` itself has no session.
- Each request from the harness looks like a new address, so that failures do not reach the rate limit. A test of the limit passes its own `x-forwarded-for`.
- Direct database access lives in `test/support/seed.ts` and nowhere else.
- `test/known-failures/` holds audit crashes as `it.fails`, which accepts any failure. When a fix makes one fail the run, delete its marker and keep the test. When you change one, remove the marker for a run and confirm it fails on its bug.
