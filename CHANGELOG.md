# Changelog

Notable changes to ShowStream. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). There are no releases yet.

## Unreleased

### Added

- Apache-2.0 licence, security policy and code of conduct.
- Required CI check on pull requests to `main`, and Renovate for dependency updates.
- `scripts/setup.sh`, which prepares a clone for development.
- Contributor documentation and issue and pull request templates.

### Changed

- Upgraded to Next.js 16, React 19.3, Node 26, pnpm 12, TypeScript 7 and ESLint 10.
- The MongoDB and API ports are no longer published to the host.

### Fixed

- The Next.js and React remote code execution vulnerability.
- Container startup failures, and file permissions on `./media` and `./data`.
