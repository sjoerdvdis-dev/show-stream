# Security Policy

## Not safe for the internet yet

ShowStream is in early development. Do not expose it to the internet until Phase 1 of [the plan](./docs/PLAN.md) is finished. These problems are known and planned:

- The API has no authentication of its own.
- A default `admin`/`admin` account is created at startup.
- Secrets are built into the API image.
- There is no HTTPS.

## Supported versions

There are no releases yet. Only the `main` branch gets fixes.

## Reporting a vulnerability

Report vulnerabilities privately through [GitHub](https://github.com/sjoerdvdis-dev/show-stream/security/advisories/new). Do not open a public issue.

Include what is affected, how to reproduce it, and what an attacker could do with it. Reports of the known problems above are not needed.

This is a project with one maintainer, so there is no guaranteed response time.
