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
| `apps/api-server/.env` | Creates it from `.env.example` with a generated `JWT_SECRET`. An existing file is never changed |

ffmpeg may ask for your `sudo` password. If Chromium is missing system libraries, the script stops and prints the command that installs them.

**One manual step:** set `TMDB_API_READ_ACCESS_TOKEN` in `apps/api-server/.env`. Create a free token at [TMDB](https://developer.themoviedb.org/docs/getting-started). Only library scans need it.

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

`pnpm dev` reads media from `apps/api-server/media`, and Docker reads it from `./media`.

## Checks

Run this before finishing work. It is the same command the required CI check runs:

```bash
pnpm turbo check-types lint build
```

CI does not build images. If you change a Dockerfile, build it yourself.

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
| `apps/api-server/.env` | No | Your secrets. Wins over the tracked files |

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
- **There is no local `mongod` or browser.** MongoDB runs in Docker, and Chromium comes from Playwright. For browser tests in Docker, use `mcr.microsoft.com/playwright`.
- **Skills that only you can start.** Skills such as `/to-spec` and `/implement` are marked `disable-model-invocation`, so Claude cannot load them unless you type the command.
- **Port 3000 is published on all interfaces** until Caddy arrives in Phase 1.
