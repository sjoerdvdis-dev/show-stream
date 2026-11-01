# Local development

## Requirements

- Node.js 26 (see `.nvmrc`)
- Docker with Compose, only for the full stack and the browser tests

`scripts/setup.sh` installs the rest, and is safe to run again to repair a setup:

```bash
./scripts/setup.sh
```

| Step | What it does |
|---|---|
| Tools | Installs pnpm, dependencies, ffmpeg, and the Chromium that Playwright MCP needs |
| Folders | Creates the media folders and `data`, and the `show_stream_network` Docker network if Docker is running |
| `apps/api/.env` | Creates it from `.env.example`. An existing file is never changed |

ffmpeg may ask for your `sudo` password. If Chromium is missing system libraries, the script stops and prints the command that installs them.

**One manual step:** set `TMDB_API_READ_ACCESS_TOKEN` in `apps/api/.env`. Create a free token at [TMDB](https://developer.themoviedb.org/docs/getting-started). Only library scans need it.

## Run the apps

Start the API on port 5000 and the client on port 3000:

```bash
pnpm dev
```

Open <http://localhost:3000>. A new database takes you to `/setup`, where you create the owner account. There is no default account and no password reset yet, so to start over, stop the API and delete `data/app.db*`.

`pnpm dev` builds `packages/contract`, `packages/db` and `packages/api-client` first, and the API runs that build. After changing one of them, restart `pnpm dev`.

`pnpm dev` reads media from `apps/api/media`, and Docker reads it from `./media`.

The API creates its database at `data/app.db` on first start, and applies any new migration each time it starts. To start over, stop the API and delete `data/app.db*`.

## Change the database

Edit `packages/db/src/schema.ts`, then generate a migration and commit it:

```bash
pnpm --filter @workspace/db generate
```

See `packages/db/AGENTS.md`.

## Query the database

Agents get read-only SQL through DBHub, the `database` server in `.mcp.json`. It is a dev tool, so it runs only in the `dev-tools` profile of `docker-compose.dev.yml`, on `127.0.0.1:8099`. Use development data only.

Start it from the project that runs your stack, to read that stack's `sqlite-data` volume:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev-tools up -d db-mcp
```

To read the `pnpm dev` database instead, start `pnpm dev` first, then:

```bash
DBHUB_DATA=./data docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev-tools up -d db-mcp
```

| Setup | DBHub sees |
|---|---|
| Compose stack | Its live data. Tested |
| `pnpm dev`, Docker Desktop on WSL2, repo in the Linux filesystem | Its live data, including through WAL checkpoints. Tested |
| `pnpm dev`, anywhere else | Not tested. A host process and a container may not share WAL memory across a bind mount, so reads can be stale or fail. Use the Compose stack there |

A read-only mount cannot create SQLite's `-shm` file, so start the API before DBHub. `unable to open database file` means `app.db` has no `-wal` or `-shm` beside it. Claude Code reports the `database` server as failed until the service is up.

## Checks

Run this before finishing work. It is the same command the required CI check runs:

```bash
pnpm turbo check-types lint build test
```

## Tests

| Command | Runs | Needs |
|---|---|---|
| `pnpm test` | API tests in `apps/api/test`, and database tests in `packages/db/test` | Nothing beyond setup. No Docker |
| `pnpm test:browser` | Chromium tests in `apps/e2e` | Docker |

**API tests** start the real API as a child process, from a temporary copy of its source, and speak HTTP to it. Each server gets its own temporary SQLite file. They use fake configuration and never read `apps/api/.env` or touch your media. TMDB calls go to a closed port, so nothing leaves your machine.

Tests that run a real ffmpeg job skip with a message if `ffmpeg` is missing. In CI, the missing `ffmpeg` fails the run instead.

**Database tests** call `packages/db` directly on a temporary file, for what HTTP cannot see: migrations from empty, the pragmas, a shared TMDB ID, a title with no TMDB ID and a single settings row.

Almost every route needs a session, so a test starts with `api.createOwner()` and makes its requests through the client that returns.

**Known failures** in `apps/api/test/known-failures` state the correct behaviour for an audit crash, marked `it.fails`. They pass while the bug exists and fail the run once it is fixed. The step that fixes one deletes its marker. `it.fails` accepts any failure, so after changing one, run it without the marker and confirm that it fails on its bug and not on a 401. Each title names the finding and the roadmap item expected to fix it:

```bash
grep -rn "it.fails" apps/api/test
```

**Browser tests** build the whole system under the Compose project `show-stream-browser-tests` with fake secrets, then run Playwright in a container on that project's network. Nothing is published to the host, and `./media` and `./data` are not mounted. Afterwards the script removes the containers, volumes and network, the images it built, and any image it had to pull. Docker's build cache stays, so later runs are faster. To run beside another copy, set `COMPOSE_PROJECT_NAME`.

After a failure, screenshots and traces are in `apps/e2e/test-results`. The movie comes from `apps/e2e/fixtures/seed.mjs`, which the one-shot `seed` service runs after the API has migrated a new volume, and `clip.mp4` beside it is a generated 30-second H.264 and AAC clip.

CI does not build images in the required check. If you change a Dockerfile, build it yourself or read the `browser` job's result.

## Full stack in Docker

```bash
bash build-docker.sh
```

This uses `./media` and the `sqlite-data` volume, and builds your `.env` into the API image until audit finding 5 is fixed. The database is at `/data/app.db` in the volume, which must stay on a local disk, never NFS or SMB.

To test without touching your images or data, export the repo, use fake secrets, and pass a separate project name with `-p`. `docker-compose.yml` sets fixed container names, so stop your own stack first.

## Scanning the library

There is no scan button yet, and a scan is admin-only. Log in as the owner, then run this in the browser console:

```js
await fetch('/api/scan', { method: 'POST' });
```

## Environment files

| File | Tracked | Holds |
|---|---|---|
| `.env.example` | Yes | Every variable, explained |
| `.env.development`, `.env.production` | Yes | Defaults with no secrets |
| `apps/api/.env` | No | Your secrets. Wins over the tracked files |

Variables already set in the environment win over all of these. An empty value counts as unset.

`apps/api/src/config.ts` validates them once at startup. If anything is wrong, the API prints every bad variable, without its value, and exits with code 1.

Never commit real values.

`SESSION_COOKIE_SECURE` defaults to true. Browsers drop a `Secure` cookie over plain HTTP, so `.env.development`, `docker-compose.yml` and the browser tests set it to false until Caddy adds HTTPS. If you run the API yourself over HTTP and login seems to do nothing, this is why.

## Known problems

- **WSL: Docker stops after a restart.** `docker` then says it is not in this distro. Start Docker Desktop on Windows.
- **WSL: non-interactive shells can miss Node.** If `node` is not found, load nvm from `~/.profile`.
- **WSL: plugins.** Claude Code plugins are documented as unavailable in WSL desktop sessions. This repo uses file-based skills and `.mcp.json`, so nothing depends on them.
- **`corepack` does not exist on Node 26.** Use the pnpm that setup installs. Images install it with `npm`.
- **pnpm refuses very new releases.** Its minimum release age rejected a package published the same day. Wait, or use the previous version. Do not add an exclusion.
- **Playwright MCP needs a matching browser.** When its pin in `.mcp.json` changes, run setup again.
- **`apk` errors while building images.** `dl-cdn.alpinelinux.org` has truncated downloads before. Retry, or compare with `mirrors.edge.kernel.org`.
- **Containers run as UID 1000.** `./media` must be writable by that user. On Linux with another UID, `chown` it to 1000 until audit finding 44 is fixed. The image prepares the `sqlite-data` volume itself.
- **Skills that only you can start.** Skills such as `/to-spec` and `/implement` are marked `disable-model-invocation`, so Claude cannot load them unless you type the command.
- **Port 3000 is published on all interfaces** until Caddy arrives in Phase 1.
- **`Too many attempts`** after 10 failed logins or setups from one address in 15 minutes. The count lives in memory, so restarting the API clears it.
- **The rate limit trusts `X-Forwarded-For` from Next.** Next forwards a client's own header, so until Caddy replaces it as the proxy, a client that sets this header escapes the limit.
- **`vitest` alone needs the packages built.** `pnpm test` builds them first. If you run `vitest` directly in `apps/api`, run `pnpm turbo build --filter=api^...` once.
- **ffmpeg cannot write to a `MEDIA_FOLDER` containing `%d` or a form like `%03d`.** It reads that as part of the segment pattern, and `%%` does not escape it. Rename the folder.
