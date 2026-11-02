# Security Policy

## Not safe for the internet yet

ShowStream is in early development. Do not expose it to the internet until Phase 1 of [the plan](./docs/PLAN.md) is finished. These problems are known and planned:

- Secrets are built into the API image.

Compose serves HTTPS through Caddy, with a `Secure` session cookie, and Caddy replaces a client's own `X-Forwarded-For`. See the [self-hosting guide](./docs/guides/self-hosting.md). The `public` and `tailscale` HTTPS modes pass `caddy validate`, but have not been run.

## Supported versions

There are no releases yet. Only the `main` branch gets fixes.

## Reporting a vulnerability

Report vulnerabilities privately through [GitHub](https://github.com/sjoerdvdis-dev/show-stream/security/advisories/new). Do not open a public issue.

Include what is affected, how to reproduce it, and what an attacker could do with it. Reports of the known problems above are not needed.

This is a project with one maintainer, so there is no guaranteed response time.
