# ShowStream

A self-hosted media server, built to replace Jellyfin. Early development.

> [!WARNING]
> **ShowStream is early software.** Phase 1 of [the plan](./docs/PLAN.md) is done, which is the earliest it may go on the internet, but the `public` HTTPS mode has not been run yet. See [SECURITY.md](./SECURITY.md).

## What works today

- Browsing a movie library
- Converting a video to HLS and playing it in the browser, with seeking

- Scanning the library from Settings, as an admin
- A daily backup of the database, keeping the last 7

Filters exist, but scans have not been tested against real TMDB responses. TV shows are not supported yet. Where this is going is in [the plan](./docs/PLAN.md).

## Run it

You need Docker with Compose, and a free [TMDB read access token](https://developer.themoviedb.org/docs/getting-started) for scans.

1. Copy `.env.example` to `.env`, and set `TMDB_API_READ_ACCESS_TOKEN`. Set `PUID` and `PGID` too if your user is not 1000. Everything else has a default, and ShowStream starts with no `.env` at all.

2. Put your movies in `media/movies`, one folder each, with the video named like its folder:

   ```text
   media/movies/The Dark Knight (2008)/The Dark Knight (2008).mp4
   ```

   Only `.mp4` files are scanned for now.

3. Build and start everything:

   ```bash
   docker compose up --build
   ```

Open <https://localhost>. Your browser warns about the certificate until you trust Caddy's CA, and the [self-hosting guide](./docs/guides/self-hosting.md) explains that and how to use a domain or Tailscale instead. The first start takes you to a setup page, where you create the owner account. Then open Settings and press **Scan library**.

Only ports 80 and 443 are published, and port 80 redirects to HTTPS.

The database lives in the `sqlite-data` Docker volume, which must stay on a local disk. `./media` can be on a NAS. Backups go to `./backups`. The [self-hosting guide](./docs/guides/self-hosting.md) covers settings, file ownership, logs, backups and upgrades.

## Develop

See [CONTRIBUTING.md](./CONTRIBUTING.md) and the [local development guide](./docs/guides/local-development.md).

## Licence

[Apache-2.0](./LICENSE). If you redistribute ShowStream or work based on it, the licence requires you to keep the [NOTICE](./NOTICE) file, which credits Sjoerd van Dis.
