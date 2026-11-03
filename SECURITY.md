# Security Policy

## Going on the internet

ShowStream is in early development. Phase 1 of [the plan](./docs/PLAN.md) is finished, which is the earliest it may go on the internet. Expose it only with care, and know what has not been tried:

- The `public` and `tailscale` HTTPS modes pass `caddy validate`, but have not been run.
- Real TMDB responses have not been tried.
- There is no HSTS, because it would lock out devices that do not trust the internal CA yet.

Compose serves HTTPS through Caddy, with a `Secure` session cookie, and Caddy replaces a client's own `X-Forwarded-For`. Only ports 80 and 443 are published, and Caddy serves the web app itself, as static files, with no Node server on the public path. The app's responses send `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin` and a `Content-Security-Policy` that allows only the server's own origin, with the one inline script allowed by its hash, no `eval`, and no framing. Styles allow `'unsafe-inline'`, because the toasts and some primitives insert style elements. Every route needs a session unless it is one of the three public ones. Secrets reach containers at runtime through an optional `.env`, and `.dockerignore` keeps them out of images. The API and the worker drop root before the app starts. See the [self-hosting guide](./docs/guides/self-hosting.md).

## Supported versions

There are no releases yet. Only the `main` branch gets fixes.

## Reporting a vulnerability

Report vulnerabilities privately through [GitHub](https://github.com/sjoerdvdis-dev/show-stream/security/advisories/new). Do not open a public issue.

Include what is affected, how to reproduce it, and what an attacker could do with it. Reports of the known problems above are not needed.

This is a project with one maintainer, so there is no guaranteed response time.
