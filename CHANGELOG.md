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

### Changed

- Upgraded to Next.js 16, React 19.3, Node 26, pnpm 12, TypeScript 7 and ESLint 10.
- The MongoDB and API ports are no longer published to the host.
- **Breaking:** every failed API response now has one JSON body, `{ code, message, details? }`. Malformed input returns 400. An unknown title returns 404 where it returned 400, as does a title with no video file. A stream that is not ready returns 404 where it returned 400. Success responses and paths are unchanged.
- The API refuses to start on invalid configuration, names every bad variable and prints no values. `MONGO_DB_URL`, `MONGO_DB_USERNAME`, `MONGO_DB_PASSWORD`, `JWT_SECRET` and `JWT_EXPIRES_IN` are required. An explicit `MEDIA_FOLDER` must be an existing folder.
- The API moved from `apps/api-server` to `apps/api`, and `packages/types` became `packages/contract`. In an existing clone, move your `.env` and any media from `apps/api-server` to `apps/api`. The Compose service and container are now `api`, so run `docker compose up -d --remove-orphans` to replace the old container.

### Fixed

- The Next.js and React remote code execution vulnerability.
- A malformed stream URL no longer takes the API down, and login no longer accepts a database operator.
- `MEDIA_FOLDER` now applies to transcoding, streaming and the cache as well as scans, including a path with a space or a dot folder.
- Container startup failures, and file permissions on `./media` and `./data`.
