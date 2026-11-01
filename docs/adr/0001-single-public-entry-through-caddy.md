# One public entry point through Caddy

Only Caddy is published, on ports 80 and 443. It terminates HTTPS, serves the web app, and routes `/api`, `/socket` and `/streams` to the API, which stays on the internal Docker network. HTTPS is required because a PWA's service worker will not run without it, and direct routing keeps video out of a web framework's request path.

## Consequences

Dev-only ports bind to `127.0.0.1` and live in `docker-compose.dev.yml`. A closed port is not authentication, so the API still verifies every request ([ADR-0004](./0004-api-owned-session-auth.md)).
