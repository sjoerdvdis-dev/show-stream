# ShowStream

A self-hosted media server, built to replace Jellyfin. Early development.

> [!WARNING]
> **Do not expose ShowStream to the internet yet.** There is no HTTPS, so passwords and session cookies travel in plain text. See [SECURITY.md](./SECURITY.md).

## What works today

- Browsing a movie library
- Converting a video to HLS and playing it in the browser, with seeking

Library scans and filters exist, but scans have not been tested against real TMDB responses. TV shows are not supported yet. Where this is going is in [the plan](./docs/PLAN.md).

## Run it

You need Node.js 26, Docker with Compose for the full stack, and a free [TMDB read access token](https://developer.themoviedb.org/docs/getting-started) for scans.

1. Prepare the clone. This also installs the development tools.

   ```bash
   ./scripts/setup.sh
   ```

2. Set `TMDB_API_READ_ACCESS_TOKEN` in `apps/api/.env`.

3. Put your movies in `media/movies`, one folder each, with the video named like its folder:

   ```text
   media/movies/The Dark Knight (2008)/The Dark Knight (2008).mp4
   ```

   Only `.mp4` files are scanned for now.

4. Build and start everything:

   ```bash
   bash build-docker.sh
   ```

Open <http://localhost:3000>. The first start takes you to a setup page, where you create the owner account.

The database lives in the `sqlite-data` Docker volume, which must stay on a local disk. `./media` can be on a NAS.

## Develop

See [CONTRIBUTING.md](./CONTRIBUTING.md) and the [local development guide](./docs/guides/local-development.md).

## Licence

[Apache-2.0](./LICENSE). If you redistribute ShowStream or work based on it, the licence requires you to keep the [NOTICE](./NOTICE) file, which credits Sjoerd van Dis.
