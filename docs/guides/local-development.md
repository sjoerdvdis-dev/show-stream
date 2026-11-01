# Local development

## Requirements

- Node.js 26 (see `.nvmrc`)
- Docker with Compose, running

`scripts/setup.sh` installs the rest, and is safe to run again to repair a setup:

```bash
./scripts/setup.sh
```

| Step | What it does |
|---|---|
| Tools | Installs pnpm, dependencies, ffmpeg, and the Chromium that Playwright MCP needs |
| Folders | Creates the media folders and `data`, and the `show_stream_network` Docker network |
| `apps/api/.env` | Creates it from `.env.example` with a generated `JWT_SECRET`. An existing file is never changed |

ffmpeg may ask for your `sudo` password. If Chromium is missing system libraries, the script stops and prints the command that installs them.

**One manual step:** set `TMDB_API_READ_ACCESS_TOKEN` in `apps/api/.env`. Create a free token at [TMDB](https://developer.themoviedb.org/docs/getting-started). Only library scans need it.

## Run the apps

Start MongoDB on loopback:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongodb
```

Start the API on port 5000 and the client on port 3000:

```bash
pnpm dev
```

Log in at <http://localhost:3000> with `admin`/`admin`.

`pnpm dev` builds `packages/contract` and `packages/api-client` first, and the API runs that build. After changing either package, restart `pnpm dev`.

`pnpm dev` reads media from `apps/api/media`, and Docker reads it from `./media`.

## Checks

Run this before finishing work. It is the same command the required CI check runs:

```bash
pnpm turbo check-types lint build test
```

## Tests

| Command | Runs | Needs |
|---|---|---|
| `pnpm test` | API tests in `apps/api/test` | Nothing beyond setup. No Docker |
| `pnpm test:browser` | Chromium tests in `apps/e2e` | Docker |

**API tests** start the real API as a child process, from a temporary copy of its source, and speak HTTP to it. Each suite gets its own MongoDB from `mongodb-memory-server`, which downloads `mongod` to `~/.cache/mongodb-binaries` on the first run. They use fake configuration and never read `apps/api/.env` or touch your media. TMDB calls go to a closed port, so nothing leaves your machine.

Tests that run a real ffmpeg job skip with a message if `ffmpeg` is missing. In CI, the missing `ffmpeg` fails the run instead.

**Known failures** in `apps/api/test/known-failures` state the correct behaviour for an audit crash, marked `it.fails`. They pass while the bug exists and fail the run once it is fixed. The step that fixes one deletes its marker. Each title names the finding and the roadmap item expected to fix it:

```bash
grep -rn "it.fails" apps/api/test
```

**Browser tests** build the whole system under the Compose project `show-stream-browser-tests` with fake secrets, then run Playwright in a container on that project's network. Nothing is published to the host, and `./media` and `./data` are not mounted. Afterwards the script removes the containers, volumes and network, the images it built, and any image it had to pull. Docker's build cache stays, so later runs are faster. To run beside another copy, set `COMPOSE_PROJECT_NAME`.

After a failure, screenshots and traces are in `apps/e2e/test-results`. The movie comes from `apps/e2e/fixtures/seed.js`, and `clip.mp4` beside it is a generated 30-second H.264 and AAC clip.

CI does not build images in the required check. If you change a Dockerfile, build it yourself or read the `browser` job's result.

## Full stack in Docker

```bash
bash build-docker.sh
```

This uses `./media` and `./data`, and builds your `.env` into the API image until audit finding 5 is fixed.

To test without touching your images or data, export the repo, use fake secrets, and pass a separate project name with `-p`. `docker-compose.yml` sets fixed container names, so stop your own stack first.

## Scanning the library

There is no scan button yet. Call `GET /api/scan` while logged in.

## Environment files

| File | Tracked | Holds |
|---|---|---|
| `.env.example` | Yes | Every variable, explained |
| `.env.development`, `.env.production` | Yes | Defaults with no secrets |
| `apps/api/.env` | No | Your secrets. Wins over the tracked files |

Variables already set in the environment win over all of these. An empty value counts as unset.

`apps/api/src/config.ts` validates them once at startup. If anything is wrong, the API prints every bad variable, without its value, and exits with code 1.

Never commit real values.

## Known problems

- **WSL: Docker stops after a restart.** `docker` then says it is not in this distro. Start Docker Desktop on Windows.
- **WSL: non-interactive shells can miss Node.** If `node` is not found, load nvm from `~/.profile`.
- **WSL: plugins.** Claude Code plugins are documented as unavailable in WSL desktop sessions. This repo uses file-based skills and `.mcp.json`, so nothing depends on them.
- **`corepack` does not exist on Node 26.** Use the pnpm that setup installs. Images install it with `npm`.
- **pnpm refuses very new releases.** Its minimum release age rejected a package published the same day. Wait, or use the previous version. Do not add an exclusion.
- **Playwright MCP needs a matching browser.** When its pin in `.mcp.json` changes, run setup again.
- **`apk` errors while building images.** `dl-cdn.alpinelinux.org` has truncated downloads before. Retry, or compare with `mirrors.edge.kernel.org`.
- **Containers run as UID 1000.** `./media` and `./data` must be writable by that user. On Linux with another UID, `chown` them to 1000 until audit finding 44 is fixed.
- **There is no local `mongod` for development.** `pnpm dev` uses MongoDB in Docker. Only the API tests download their own.
- **Skills that only you can start.** Skills such as `/to-spec` and `/implement` are marked `disable-model-invocation`, so Claude cannot load them unless you type the command.
- **Port 3000 is published on all interfaces** until Caddy arrives in Phase 1.
- **`vitest` alone needs the packages built.** `pnpm test` builds them first. If you run `vitest` directly in `apps/api`, run `pnpm turbo build --filter=api^...` once.
- **ffmpeg cannot write to a `MEDIA_FOLDER` containing `%d` or a form like `%03d`.** It reads that as part of the segment pattern, and `%%` does not escape it. Rename the folder.
