# Changelog

Notable changes to ShowStream. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). There are no releases yet.

## Unreleased

### Added

- Apache-2.0 licence, security policy and code of conduct.
- Required CI check on pull requests to `main`, and Renovate for dependency updates.
- `scripts/setup.sh`, which prepares a clone for development.
- Contributor documentation and issue and pull request templates.
- API tests with `pnpm test`, and browser tests with `pnpm test:browser`.
- `packages/api-client`, a typed client built from the endpoint definitions in `packages/contract`.
- `packages/db`, which owns the schema, migrations, connection setup and queries.
- A read-only database MCP for development, with DBHub in the `dev-tools` Compose profile.
- First-run setup: a new install opens on a `/setup` page that creates the owner account.
- Logging out, from the settings page.
- `apps/worker`, a separate process and image that runs ffmpeg from a job queue in SQLite. It publishes no ports, and `pnpm dev` and Compose start it.
- A failed transcode shows its reason, and has a Retry button on the movie's page.
- `JOB_CONCURRENCY` limits how many jobs run at once, and defaults to 1.
- A Library section in Settings, where an owner or admin starts a scan and reads its result.
- A daily database backup, written by the worker to `./backups` with `VACUUM INTO`, keeping the last 7. `BACKUP_FOLDER` moves it under `pnpm dev`. The guide explains how to restore one.
- Caddy as the only published service, on ports 80 and 443, with HTTPS by default. `TLS_MODE` selects `internal`, `public` or `tailscale`, and `SITE_ADDRESS` names the server, in an optional `.env` at the root. `docs/guides/self-hosting.md` explains them. `public` and `tailscale` pass `caddy validate`, but have not been run.

### Changed

- Upgraded to Next.js 16, React 19.3, Node 26, pnpm 12, TypeScript 7 and ESLint 10.
- The MongoDB and API ports are no longer published to the host.
- **Breaking:** SQLite replaces MongoDB. There is no database server, no database password, and `pnpm dev` no longer needs Docker. The database is one file: `data/app.db` under `pnpm dev`, and `/data/app.db` on the `sqlite-data` volume under Compose. `DATABASE_PATH` changes it. Migrations run at API startup, and a failed migration stops the API.
- **Upgrading from MongoDB:** existing data is not carried over. Your library comes back with a rescan, but users are not kept, so create the owner again in setup. Leftover `MONGO_DB_*` variables in `.env` are ignored and can be deleted, and the old database files in `./data` can be removed. In a Compose stack, run `docker compose up -d --remove-orphans` to remove the old `mongodb` container.
- **Breaking:** every failed API response now has one JSON body, `{ code, message, details? }`. Malformed input returns 400. An unknown title returns 404 where it returned 400, as does a title with no video file. A stream that is not ready returns 404 where it returned 400. Success responses and paths are unchanged.
- The API refuses to start on invalid configuration, names every bad variable and prints no values. An explicit `MEDIA_FOLDER` must be an existing folder.
- **Breaking:** the API owns authentication. Every route needs a session unless the contract marks it public, and only `GET /auth/setup`, `POST /auth/setup` and `POST /auth/login` are. Sessions are random tokens in an `httpOnly`, `SameSite=Lax` cookie named `session`, stored only as hashes, and they end after 30 idle days or on logout.
- **Breaking, contract:** `POST /register` and `POST /authenticate` are gone. `POST /login` is now `POST /auth/login`, and answers with the user and a cookie instead of a token. `GET /scan` is now an admin-only `POST /scan`. New: `GET` and `POST /auth/setup`, `POST /auth/logout` and `GET /auth/me`. A user now has a `role`. The error codes gain `forbidden` (403), `conflict` (409) and `rate_limited` (429).
- **Breaking:** the default `admin`/`admin` account is no longer created, and a migration deletes it from existing databases. The first start after upgrading opens on setup, and setup accepts the name `admin`. Other accounts stay, with no owner role.
- **Breaking:** socket connections need a session, and `transcode:ready` reaches only the users who asked for that transcode. Logging out disconnects that session's sockets.
- Login and setup allow 10 failed attempts per address in 15 minutes, and a non-GET request or socket handshake with an `Origin` from another site is refused.
- `JWT_SECRET` and `JWT_EXPIRES_IN` are gone, and are ignored if they remain in `.env`. The new `SESSION_COOKIE_SECURE` defaults to true. `.env.development` and `docker-compose.yml` set it to false until HTTPS arrives.
- **Breaking, contract:** `transcodeStatus` gains `failed`, and a movie gains `transcodeError`. `GET /transcode/request/:id` answers a failed title with its status and `error`, and does not start it again. New: `POST /transcode/retry/:id`, which answers 409 unless the title has failed, and the `transcode:failed` notification.
- **Upgrading to the worker:** Compose now has a `worker` service, so rebuild with `bash build-docker.sh`. A migration keeps finished transcodes and clears the ones that were in progress, which you start again by pressing Play. The API image no longer has ffmpeg. The API serves transcodes as soon as they finish, without the old 10-second delay.
- **Breaking, contract:** `POST /scan` queues a scan in the worker and answers 202 with `{ scan }`, or 409 while one is queued or running, where it answered 200 with text once the scan had finished. It no longer answers 500 for a missing `movies` folder: the scan fails and says so. New: an admin-only `GET /scan`, which answers `{ scan }` with the latest status, time, counts, reason and up to 20 errors, or `{ scan: null }`.
- **Upgrading to scans in the worker:** rebuild with `bash build-docker.sh`. Under Compose the worker now reads `TMDB_API_READ_ACCESS_TOKEN` from `apps/api/.env`, and the API no longer does. Run `scripts/setup.sh`, or create `./backups` yourself, before starting, because Docker would otherwise create it as root and backups would fail.
- **Breaking:** port 3000 is no longer published. Open <https://localhost>, or your `SITE_ADDRESS`, and port 80 redirects there. The session cookie is now `Secure` under Compose. `/api`, `/streams` and `/socket` go straight from Caddy to the API, and a built Next client no longer has a route to the API, so `API_SERVER_URL` applies only to `pnpm dev`. The API no longer sends HSTS, which would have locked out devices that do not trust the internal CA yet.
- **Upgrading to Caddy:** rebuild with `bash build-docker.sh`. `docker compose up` no longer needs a prior step, and the old `show_stream_network` can be removed with `docker network rm show_stream_network`. Containers lose their fixed names, so they are named after the Compose project. Keep the new `caddy-data` volume, because it holds the internal CA.
- The API moved from `apps/api-server` to `apps/api`, and `packages/types` became `packages/contract`. In an existing clone, move your `.env` and any media from `apps/api-server` to `apps/api`. The Compose service and container are now `api`, so run `docker compose up -d --remove-orphans` to replace the old container.

### Fixed

- The Next.js and React remote code execution vulnerability.
- A malformed stream URL no longer takes the API down, and login no longer accepts a database operator.
- `MEDIA_FOLDER` now applies to transcoding, streaming and the cache as well as scans, including a path with a space or a dot folder.
- Container startup failures, and file permissions on `./media` and `./data`.
- A movie and a show can share a TMDB ID, and a scan no longer adds a row for its time.
- A corrupt video fails on its own instead of taking the API down.
- A title no longer stays `in progress` for ever after a restart. An interrupted job recovers when the worker starts, and fails after 3 attempts.
- An interrupted transcode can no longer be served as ready, because output reaches the cache only on success.
- Any number of simultaneous requests no longer starts as many ffmpeg processes.
- A client can no longer escape the login rate limit by setting its own `X-Forwarded-For`, and the notification socket no longer takes a 308 on each request.
- A scan no longer reports success when it identified nothing. With no TMDB token, or with no folder identified, it fails with a reason. A partial scan finishes and lists its failures.

### Removed

- `fluent-ffmpeg`, which is deprecated. A small `spawn` wrapper replaces it, with the same arguments.
- `tmdb-ts` from the API, which no longer calls TMDB, and the unused `lastScanTime` setting.
