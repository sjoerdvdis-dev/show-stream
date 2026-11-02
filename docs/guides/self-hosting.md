# Self-hosting

ShowStream runs under Docker Compose. Caddy is the only published service, on ports 80 and 443, and port 80 only redirects to HTTPS. HTTP/3 is off, because it needs UDP 443.

## Start

```bash
docker compose up --build
```

Nothing else is needed: no `.env`, no setup script and no network to create. Open <https://localhost>, accept or [trust](#trust-the-ca-on-a-device) the certificate, and create the owner account.

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

## HSTS

ShowStream sends no HSTS header. After HSTS a browser offers no way past a certificate it does not trust, which would lock out a device that has not trusted the internal CA yet.
