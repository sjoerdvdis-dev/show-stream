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
| Folders | Creates the media folders, `data` and `backups` |
| `apps/api/.env` | Creates it from `.env.example`. An existing file is never changed |

ffmpeg may ask for your `sudo` password. If Chromium is missing system libraries, the script stops and prints the command that installs them.

**One manual step:** set `TMDB_API_READ_ACCESS_TOKEN` in `apps/api/.env`. Create a free token at [TMDB](https://developer.themoviedb.org/docs/getting-started). Only library scans need it, and they run in the worker, so restart it after setting the token.

## Run the apps

Start the API on port 5000, the worker, the Next client on port 3000 and the new web client on port 5173:

```bash
pnpm dev
```

| Client | Open | Notes |
|---|---|---|
| `apps/next-client` | <http://localhost:3000> | What Compose serves today |
| `apps/web` | <http://127.0.0.1:5173> | Replaces Next in Phase 2. Login, Setup, Movies, a movie's page, the player and Settings are here, on the patterns. Home, Search and Shows were stubs in the Next client, and are not rebuilt. <http://127.0.0.1:5173/dev/components> previews the design tokens, primitives and patterns in both themes |

A new database takes you to `/setup`, where you create the owner account. There is no default account and no password reset yet, so to start over, stop the API and delete `data/app.db*`.

Vite binds to `127.0.0.1`, and proxies `/api`, with the prefix removed, `/socket` and `/streams` to the API, which is what Caddy does in production. The proxy keeps the browser's `Host`, so the API's `Origin` check passes, and it does not reach the build. `API_SERVER_URL` moves its target, which defaults to `http://localhost:5000`.

`pnpm dev` builds `packages/contract`, `packages/db` and `packages/api-client` first, and the API and `apps/web` run that build. After changing one of them, restart `pnpm dev`.

`pnpm dev` reads media from `apps/api/media`, and Docker reads it from `./media`.

The API creates its database at `data/app.db` on first start, and applies any new migration each time it starts. To start over, stop the API and delete `data/app.db*`.

The worker runs ffmpeg from the host, on the same database and media, and takes library scans and backups. It logs `Waiting for the API to migrate the database` until the API has started, which is normal. `JOB_CONCURRENCY` sets how many jobs run at once, and the worker reads `apps/api/.env` as well as your environment.

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
| `pnpm test` | API tests in `apps/api/test`, worker tests in `apps/worker/test`, database tests in `packages/db/test`, client tests in `apps/web/test`, and design token and component tests in `packages/ui/test` | Nothing beyond setup. No Docker |
| `pnpm test:browser` | Chromium tests in `apps/e2e` | Docker |

**API tests** start the real API and a real worker as child processes, from temporary copies of their source, and speak HTTP to the API. Each suite gets its own pair and its own temporary SQLite file. They use fake configuration and never read `apps/api/.env` or touch your media or backups. The worker's TMDB calls go to a closed port, so nothing leaves your machine, unless a test passes `fakeTmdb`, which answers them from `test/support/fake-tmdb.mjs`.

Tests that run a real ffmpeg job skip with a message if `ffmpeg` is missing. In CI, the missing `ffmpeg` fails the run instead.

To catch a job partway, a test calls `holdFfmpeg` from `test/support/ffmpeg.ts`. In these tests the worker's `ffmpeg` is the script in `test/support/ffmpeg-shim`, which writes partial output and waits for a held title, and otherwise runs the real one. The harness can then kill the worker, or ask it to stop, at a known point.

**Worker tests** call the ffmpeg wrapper, the job loop, the scan and the backup directly, with a fake `ffmpeg` on the `PATH`, a fake job handler or a fake TMDB lookup.

**Database tests** call `packages/db` directly on a temporary file, for what HTTP cannot see: migrations from empty, the pragmas, a shared TMDB ID, a title with no TMDB ID, a single settings row, and when a scan or a backup can be queued.

Almost every route needs a session, so a test starts with `api.createOwner()` and makes its requests through the client that returns.

**Client tests** run the real router and query client of `apps/web` in `jsdom`, against a small fake API in `msw`, from `test/support/fake-api.ts`. `hls.js` and Socket.IO are fakes there, because they need a real browser and a real server, so check those by hand in Chromium. `apps/e2e` stays on the Next client until Phase 2 item 7.

**Design token tests** read `packages/ui/src/styles/tokens.css` and check that it defines every variable a shadcn theme does, each with its own value in both themes, and their contrast and sRGB gamut. They also check that no primitive uses a raw color.

**Component tests** in `packages/ui/test/components` render the primitives and patterns in `jsdom` and drive them by keyboard, as a user does: focus traps and Escape, arrow keys and typeahead, toggles, command filtering, calendar dates, filters and the player's shortcuts. Check how they look in Chromium at `/dev/components`.

**Browser tests** build the whole system under the Compose project `show-stream-browser-tests` with fake secrets, then run Playwright in a container on that project's network. Nothing is published to the host, and `./media` and `./data` are not mounted. Afterwards the script removes the containers, volumes and network, the images it built, and any image it had to pull. Docker's build cache stays, so later runs are faster. To run beside another copy, set `COMPOSE_PROJECT_NAME`.

After a failure, screenshots and traces are in `apps/e2e/test-results`. The movies come from `apps/e2e/fixtures/seed.mjs`, which the one-shot `seed` service runs after the API has migrated a new volume. `clip.mp4` beside it is a generated 30-second H.264 and AAC clip, and `corrupt.mp4` is a text file that the worker fails on. The worker preloads `fake-tmdb.mjs` beside them, so that a scan needs no network.

CI does not build images in the required check. If you change a Dockerfile, build it yourself or read the `browser` job's result.

`pnpm test:browser` also plants fake env files in the build context, and afterwards reads every file of each built image for them.

`apps/api/test/public-entry.test.ts` fails if Compose publishes anything but ports 80 and 443 from Caddy, if a service has no health check or log limit, if a `depends_on` is not `service_healthy`, or if `.dockerignore` lets an env file through, and validates all three HTTPS modes with `caddy validate`. It is the one part of `pnpm test` that uses Docker: it skips with a warning when Docker is not running, and fails in CI.

## Full stack in Docker

```bash
bash build-docker.sh
```

Then open <https://localhost>. Caddy is the only published service, and the [self-hosting guide](./self-hosting.md) explains its HTTPS modes and how to trust its CA.

This uses `./media` and the `sqlite-data` volume. The database is at `/data/app.db` in the volume, which must stay on a local disk, never NFS or SMB.

The `worker` service shares that volume and `./media`, which it sees at `/media`, and publishes no ports. It writes backups to `./backups`, and gets the optional `.env` at the repository root at runtime, for the TMDB token. That file holds every Compose setting, and `apps/api/.env` does not reach Compose. Only one worker may run per database.

The API and the worker start as root, take the folders they write for `PUID:PGID`, 1000 by default, and drop to that user, through `infra/docker/entrypoint.sh`. Services start in order through health checks, and logs are JSON on stdout. The [self-hosting guide](./self-hosting.md) covers all of these.

## Failed videos

A video that ffmpeg cannot read shows as failed, with ffmpeg's last lines as the reason, and the movie's page has a Retry button. Replace the file first if it is corrupt, since a retry looks for the video again. If the worker dies three times during one job, that job fails too, so that it cannot keep taking the worker down.

To test without touching your images or data, export the repo, use fake secrets, and pass a separate project name with `-p`. Only one stack at a time can hold ports 80 and 443, so stop your own first.

## Scanning the library

An owner or admin starts a scan with **Scan library** in Settings, which shows the latest result. The worker runs it, so the API stays free, and a second scan is refused until the first ends. With a long transcode running and `JOB_CONCURRENCY` at 1, the scan waits for its turn.

| Result | Means |
|---|---|
| Finished | Titles were identified, or the library has no `Title (Year)` folders. Unmatched and failed folders are listed, up to 20, and the counts stay true |
| Failed | No TMDB token is set, the `movies` folder could not be read, or folders were found and none were identified. Look at the reason, which shows a bad token as TMDB's own message |

Only folders in `media/movies` named `Title (Year)` count. A scan has only been tested against a fake TMDB, so tell us how a real one goes.

## Back up and restore

The worker writes `show-stream-YYYY-MM-DD.db` to the backup folder once each UTC day, the first time it runs that day, and keeps the last 7. The folder is `./backups` under Compose and `pnpm dev`, and `BACKUP_FOLDER` moves it under `pnpm dev`. Unlike the database, it can be on a NAS, but only local disks have been tested. It holds your accounts and password hashes, so keep it private.

A backup that fails is logged by the worker and tried again the next day. A backup holds the library, accounts and job states, not your media or transcodes.

To restore under Compose, stop everything that opens the database, replace it, and start again. Pick a file from `./backups`:

```bash
docker compose stop api worker
docker compose run --rm --no-deps worker \
  sh -c 'rm -f /data/app.db /data/app.db-wal /data/app.db-shm && cp /backups/show-stream-YYYY-MM-DD.db /data/app.db'
docker compose start api worker
```

Under `pnpm dev`, stop it, then:

```bash
rm -f data/app.db data/app.db-wal data/app.db-shm
cp backups/show-stream-YYYY-MM-DD.db data/app.db
```

Delete the `-wal` and `-shm` files too, because SQLite would otherwise apply them to the restored file. The API applies any newer migration when it starts. Sessions come back as they were in the backup, so anyone who logged in since then logs in again. Today's backup file stays as it is, so a restored older database cannot overwrite it. A backup is taken while its own job runs, so the worker logs `Recovered job` for it after a restore, which is normal.

The Compose steps were tested once by hand on 2026-11-02, with fake secrets: a lost database asked for setup again, and after the restore the owner logged in. The `pnpm dev` steps were not run.

## Environment files

| File | Tracked | Holds |
|---|---|---|
| `.env.example` | Yes | Every variable, explained |
| `.env.development`, `.env.production` | Yes | Defaults with no secrets |
| `apps/api/.env` | No | Your secrets, for `pnpm dev`. Wins over the tracked files |
| `.env` at the root | No | Your settings and secrets, for Compose. See the [self-hosting guide](./self-hosting.md#settings-and-secrets) |

Variables already set in the environment win over all of these. An empty value counts as unset.

`apps/api/src/config.ts` validates them once at startup, and `apps/worker/src/config.ts` does the same for the worker's. If anything is wrong, either one prints every bad variable, without its value, and exits with code 1.

Never commit real values.

`SESSION_COOKIE_SECURE` defaults to true. Browsers drop a `Secure` cookie over plain HTTP, so only `.env.development` sets it to false, for `pnpm dev`. Compose and the browser tests run over HTTPS and leave it alone. If you run the API yourself over HTTP and login seems to do nothing, this is why.

## Known problems

- **WSL: Docker stops after a restart.** `docker` then says it is not in this distro. Start Docker Desktop on Windows.
- **WSL: non-interactive shells can miss Node.** If `node` is not found, load nvm from `~/.profile`.
- **WSL: plugins.** Claude Code plugins are documented as unavailable in WSL desktop sessions. This repo uses file-based skills and `.mcp.json`, so nothing depends on them.
- **`corepack` does not exist on Node 26.** Use the pnpm that setup installs. Images install it with `npm`.
- **pnpm refuses very new releases.** Its minimum release age rejected a package published the same day. Wait, or use the previous version. Do not add an exclusion.
- **Playwright MCP needs a matching browser.** When its pin in `.mcp.json` changes, run setup again.
- **`apk` errors while building images.** `dl-cdn.alpinelinux.org` has truncated downloads before. Retry, or compare with `mirrors.edge.kernel.org`.
- **Skills that only you can start.** Skills such as `/to-spec` and `/implement` are marked `disable-model-invocation`, so Claude cannot load them unless you type the command.
- **`Too many attempts`** after 10 failed logins or setups from one address in 15 minutes. The count lives in memory, so restarting the API clears it.
- **`pnpm dev` is not the shipped path.** It has no Caddy, so `next.config.mjs` rewrites `/api` and `/socket` to the API, as the proxy in `apps/web/vite.config.ts` does for the new client, and a built client has neither. Next passes on a client's own `X-Forwarded-For` there, so the rate limit proves nothing under `pnpm dev`, and Next answers `/socket/` with a 308 first. Test those through `pnpm test:browser`.
- **`vitest` alone needs the packages built.** `pnpm test` builds them first. If you run `vitest` directly in `apps/api`, run `pnpm turbo build --filter=api^...` once.
- **ffmpeg cannot write to a `MEDIA_FOLDER` containing `%d` or a form like `%03d`.** It reads that as part of the segment pattern, and `%%` does not escape it. Rename the folder.
