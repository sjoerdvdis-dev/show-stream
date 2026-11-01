# Local development

## Requirements

- Node.js 26 (see `.nvmrc`) and pnpm (the version comes from `packageManager` in `package.json`)
- Docker with Compose
- ffmpeg, for running the API outside Docker

## Setup

```bash
pnpm install
```

Copy `apps/api-server/.env.example` to `apps/api-server/.env` and fill it in.

Start MongoDB on loopback:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongodb
```

Start the apps:

```bash
pnpm dev
```

`pnpm dev` has not been tested since the Next.js 16 upgrade.

## Checks

Run these before finishing work:

```bash
pnpm turbo check-types lint build
```

This is the same command the required CI check runs.

## Full stack in Docker

```bash
bash build-docker.sh
```

This uses `./media` and `./data`, and builds your `.env` into the API image until audit finding 5 is fixed.

## Scanning the library

There is no scan button yet. Call `GET /api/scan` while logged in.
