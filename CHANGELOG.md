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

### Changed

- Upgraded to Next.js 16, React 19.3, Node 26, pnpm 12, TypeScript 7 and ESLint 10.
- The MongoDB and API ports are no longer published to the host.
- **Breaking:** SQLite replaces MongoDB. There is no database server, no database password, and `pnpm dev` no longer needs Docker. The database is one file: `data/app.db` under `pnpm dev`, and `/data/app.db` on the `sqlite-data` volume under Compose. `DATABASE_PATH` changes it. Migrations run at API startup, and a failed migration stops the API.
- **Upgrading from MongoDB:** existing data is not carried over. Your library comes back with a rescan, but users are not kept, so register them again. Leftover `MONGO_DB_*` variables in `.env` are ignored and can be deleted, and the old database files in `./data` can be removed. In a Compose stack, run `docker compose up -d --remove-orphans` to remove the old `mongodb` container.
- **Breaking:** every failed API response now has one JSON body, `{ code, message, details? }`. Malformed input returns 400. An unknown title returns 404 where it returned 400, as does a title with no video file. A stream that is not ready returns 404 where it returned 400. Success responses and paths are unchanged.
- The API refuses to start on invalid configuration, names every bad variable and prints no values. `JWT_SECRET` and `JWT_EXPIRES_IN` are required. An explicit `MEDIA_FOLDER` must be an existing folder.
- The API moved from `apps/api-server` to `apps/api`, and `packages/types` became `packages/contract`. In an existing clone, move your `.env` and any media from `apps/api-server` to `apps/api`. The Compose service and container are now `api`, so run `docker compose up -d --remove-orphans` to replace the old container.

### Fixed

- The Next.js and React remote code execution vulnerability.
- A malformed stream URL no longer takes the API down, and login no longer accepts a database operator.
- `MEDIA_FOLDER` now applies to transcoding, streaming and the cache as well as scans, including a path with a space or a dot folder.
- Container startup failures, and file permissions on `./media` and `./data`.
- A movie and a show can share a TMDB ID, and a scan keeps one last-scan setting instead of adding a row.
