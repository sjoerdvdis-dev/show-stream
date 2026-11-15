# Self-hosting

ShowStream runs under Docker Compose. Caddy is the only published service, on ports 80 and 443, and port 80 only redirects to HTTPS. HTTP/3 is off, because it needs UDP 443.

## Start

```bash
docker compose up --build
```

This builds three images: the API, the worker, and Caddy, whose image holds the web app, built from `apps/web`, and the Caddyfile. Caddy serves the app as static files, and sends `/api`, `/socket` and `/streams` to the API. Nothing else is needed: no `.env`, no setup script and no network to create. Open <https://localhost>, accept or [trust](#trust-the-ca-on-a-device) the certificate, and create the owner account.

Under the default mode your browser warns about the certificate until you trust Caddy's CA. Chromium accepts the `Secure` session cookie once you pass that warning.

## Choose an HTTPS mode

Copy `.env.example` to `.env` at the root of the repository, and set `TLS_MODE` and `SITE_ADDRESS`. Compose reads that file, and nobody edits the Caddyfile. Run `docker compose up -d` again after changing it.

| `TLS_MODE` | For | `SITE_ADDRESS` | Tested |
|---|---|---|---|
| `internal`, the default | A LAN, with no domain or account | The name or IP address you visit, such as `192.168.1.20`. Default `localhost` | Run for real, including by IP address |
| `public` | A real domain | The domain, such as `media.example.com` | Passes `caddy validate`. **Not run** |
| `tailscale` | A tailnet | The machine's name, such as `media.your-tailnet.ts.net` | Passes `caddy validate`. **Not run** |

`SITE_ADDRESS` holds one name or address. An unknown `TLS_MODE` stops Caddy at startup.

`public` and `tailscale` were validated but never run, because they need a real domain or tailnet. Treat your first start in either mode as the test, and report what you find.

### `internal`

Caddy creates its own CA in the `caddy-data` volume and signs a certificate for `SITE_ADDRESS`. Keep that volume: a new one means a new CA, which every device must trust again.

### `public`

The domain's DNS must point at this host, and the internet must reach ports 80 and 443, so that Caddy can answer the certificate authority. Caddy then gets and renews the certificate by itself.

Read [SECURITY.md](../../SECURITY.md) before exposing a server to the internet.

### `tailscale`

The host must run Tailscale, with HTTPS certificates enabled for the tailnet. Caddy asks `tailscaled` for the certificate through its socket, which comes from an override file:

```bash
docker compose -f docker-compose.yml -f docker-compose.tailscale.yml up -d
```

## Trust the CA on a device

This applies to `internal` only. Copy the root certificate out of the running stack:

```bash
docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
```

The file is public, and holds no key. Install it on each device that visits, then restart the browser:

| Device | Steps |
|---|---|
| Windows | Open the file, choose **Install Certificate**, **Local Machine**, then **Trusted Root Certification Authorities** |
| macOS | Open the file in Keychain Access, add it to **System**, open it there and set **Trust** to **Always Trust** |
| Linux (Debian, Ubuntu) | Copy it to `/usr/local/share/ca-certificates/caddy-root.crt` and run `sudo update-ca-certificates`. Chromium and Firefox keep their own stores, so import it there too |
| iOS, iPadOS | Send the file to the device and install the profile, then turn it on in **Settings > General > About > Certificate Trust Settings** |
| Android | **Settings > Security > Encryption & credentials > Install a certificate > CA certificate**. The menu names differ by maker |

Fetching the root certificate and verifying `https://localhost` and an IP address against it with `curl` was tested. The steps for each device were not.

## Install the app

ShowStream installs as an app, a PWA, from the browser: on a phone's home screen, or as a window on a computer, with its own icon. Browsers install only over HTTPS they trust, so in `internal` mode trust the CA on the device first, as above. Without that the browser offers no install, and the app runs in a tab as before.

Open **Settings** and use **Install** under **App**. Chrome and Edge show Install there. Browsers without an install prompt, such as Safari, show how to add the app from their own menu: on an iPhone or iPad, **Share**, then **Add to Home Screen**. Firefox on a computer cannot install apps. The installed app shows no App section.

The app keeps its own files on the device, so it opens fast, and shows "Cannot reach the server" with Retry when the server is down or out of reach. It never keeps your library, art or video: those always come from the server. After an upgrade, an open app or tab offers the new version with **Reload**, and does not reload by itself, so a movie that is playing is never cut off.

Installing from Chromium on a computer was tested over HTTPS. iOS, iPadOS and Android were not.

## The desktop app

ShowStream also comes as a desktop program, `apps/desktop`, which opens your server in its own window, outside the browser. It holds no copy of the app: everything in the window comes from your server, so it is always the version your server runs.

Installers for Windows and Linux are not built yet. Until they are, run it from a clone of this repository, with Node.js and pnpm as in the [local development guide](./local-development.md):

```bash
pnpm install
pnpm --filter desktop build
pnpm --filter desktop start
```

### Connect

The first start asks for your server's address: the one you open in a browser, such as `media.example.com` or `192.168.1.20`. `https://` is added when you leave it out, and any path is dropped. The app asks the server's `/api/auth/setup` before saving the address, and says which of these went wrong:

| Message | Means |
|---|---|
| Could not reach … | No answer: a typo, the server is down, or this computer cannot reach it |
| … is not a ShowStream server | Something answered, such as a router's page, but not ShowStream |
| … has a certificate this computer does not trust | Usually Caddy's internal CA, which this computer must trust. See below |
| Use https:// | Plain `http://` is refused, except to `localhost` and `127.0.0.1`, so that your session never travels unencrypted |

Then the window shows your server's login, and you log in and play as in the browser. The session is kept when you close the app, and so are the window's size and position. **File > Change Server…** goes back to the setup page with the address forgotten. If the server cannot be reached when the app starts, the setup page says so, and **Connect** tries again.

Links to other sites open in your browser. The window only ever shows your server, and the app gives the server's pages no access to your computer, and no permission but full screen. Media keys work while a film plays.

### Trust the CA for the app

In `internal` mode, trust Caddy's CA on the computer first, as in [Trust the CA on a device](#trust-the-ca-on-a-device). The app has no way to skip the certificate check, by design. It uses what the browser uses:

| System | Store the app reads |
|---|---|
| Windows | The Windows store, as in the table above |
| Linux | The NSS database in `~/.pki/nssdb`, which Chromium uses too. With `certutil` from `libnss3-tools`: `certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "Caddy Local Authority" -i caddy-root.crt` |

Restart the app after trusting the CA. Trusting it through Linux's NSS database was tested, in the browser tests. Windows was not.

## Security headers

Caddy sends these with the web app's pages and files:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `same-origin` |
| `Content-Security-Policy` | Only the server's own origin, for scripts, styles, images, media, workers, including the service worker, the manifest and connections, including the socket. The first-paint script is allowed by its hash, `data:` images and `blob:` media and workers for the player, and `'unsafe-inline'` styles for the toasts. No framing |
| `Cache-Control` | A year, `immutable`, for the hashed files under `/assets`, and `no-cache` for the rest, including the service worker and the manifest, so an upgrade reaches every browser and installed app |

The API sends its own headers for `/api`, `/socket` and `/streams`.

## HSTS

ShowStream sends no HSTS header. After HSTS a browser offers no way past a certificate it does not trust, which would lock out a device that has not trusted the internal CA yet.

## Settings and secrets

One optional `.env` at the root of the repository holds every setting, and [`.env.example`](../../.env.example) lists them. Compose starts without it. Only the worker gets the file, because only it needs the TMDB token for scans, and the API and the worker read the rest through `docker-compose.yml`.

| Setting | Default | Does |
|---|---|---|
| `TLS_MODE`, `SITE_ADDRESS` | `internal`, `localhost` | [The HTTPS mode](#choose-an-https-mode) |
| `TMDB_API_READ_ACCESS_TOKEN` | Empty | Library scans fail without it, and say so |
| `PUID`, `PGID` | `1000` | [Who owns the data](#choose-who-owns-the-data) |
| `LOG_LEVEL` | `info` | One of `error`, `warn`, `security`, `info`, `http` or `debug` |
| `JOB_CONCURRENCY` | `1` | How many jobs the worker runs at once |

Secrets arrive when a container starts, so sharing an image shares no secret. `.dockerignore` keeps every `.env` out of a build at any depth, whatever its suffix. Only the tracked `.env.production` files go in, and they hold no secrets.

`apps/api/.env` is for `pnpm dev`, and Compose does not read it.

## Choose who owns the data

The API and the worker start as root, give the folders they write to `PUID:PGID`, then drop to that user. Set both in `.env` to your own IDs, from `id -u` and `id -g`, so that the files are yours on the host. On a NAS, use the user that owns the share.

| Folder | Holds | Taken by |
|---|---|---|
| The `sqlite-data` volume | The database | The API and the worker |
| `./backups` | Daily backups | The worker |
| `./media/cache` | Transcodes, and posters and backdrops in `./media/cache/images` | The worker, which creates it |
| The rest of `./media` | Your videos | Nobody. They are only read, so this user must be able to read them |

A start changes only files with another owner, so a normal start writes nothing, and changing `PUID` later takes what is there. If a share refuses the change, as NFS with root squash does, the container logs a warning and starts anyway, and the app may not be able to write there. `PUID` must not be 0. Caddy owns none of this.

After changing them, run `docker compose up -d` again.

## Health and startup

Every service has a health check, and `docker compose ps` shows the result.

| Service | Healthy when | Waits for |
|---|---|---|
| `api` | `GET /auth/setup` answers | Nothing |
| `worker` | Its job loop has turned in the last minute | `api` |
| `caddy` | Its admin endpoint answers | `api` |

A service that is slow to start has 60 seconds before failures count. An unhealthy service is not restarted by Docker, so restart a stalled worker with `docker compose restart worker`.

## Logs

The API and the worker write JSON to stdout, one object per line, and write no log file. Docker keeps three files of 10 MB for each service.

```bash
docker compose logs -f api worker
docker compose logs --no-log-prefix worker | jq 'select(.level == "error")'
```

Worker lines name their job with `jobId` and `jobType`. `LOG_LEVEL=http` adds each request, including the API's health check every 5 seconds.

## Posters and backdrops

A scan stores each title's poster and backdrop in `./media/cache/images`, in TMDB's `w500` and `w1280` sizes, and the API serves them to signed-in users. Browsers never ask TMDB, so viewing the library tells nobody what you watch, and stored art keeps working without internet. A scan fetches only what is missing, so a rescan fills gaps, and a failed download is listed as a problem of that scan without losing the title. Nothing removes old art yet.

Expect a few hundred kilobytes per title, so a few hundred megabytes for a thousand. That is an estimate from TMDB's sizes: no real TMDB image has been downloaded yet. Backups hold no art, and the next scan fetches it again if `./media/cache` is lost.

## Backups

The worker writes `show-stream-YYYY-MM-DD.db` to `./backups` once each UTC day, and keeps the last 7. It holds your accounts and password hashes, so keep it private. It holds no media or transcodes. Copy the folder off the machine, because a backup on the same disk does not survive that disk. `./backups` can be on a NAS, though only a local disk has been tested. The database itself must stay on a local disk.

To restore one, follow [the steps in the development guide](./local-development.md#back-up-and-restore).

## Upgrades

There are no releases yet, so an upgrade is a new `main`:

```bash
git pull
docker compose up -d --build --remove-orphans
```

`--build` matters: the web app and the Caddyfile are inside the Caddy image, so an upgrade without it keeps the old app. `--remove-orphans` removes containers of services that are gone. Read the [changelog](../../CHANGELOG.md) first, because it lists what each change needs. Take a copy of the newest backup before upgrading, because the API applies new migrations when it starts, and there is no way down. A failed migration stops the API, and the worker and Caddy then do not start.

Keep the `sqlite-data` and `caddy-data` volumes. The first holds the database, and the second holds the CA that your devices trust. `docker compose down` keeps them, and `docker compose down --volumes` deletes them.
