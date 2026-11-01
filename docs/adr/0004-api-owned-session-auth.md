# The API owns authentication with server-side sessions

The API issues and verifies all sessions, replacing JWTs checked by Next.js. Clients hold a random token in an `httpOnly`, `Secure`, `SameSite=Lax` cookie, and the database stores only its hash. Every route requires auth unless explicitly public, and client-side route guards exist only for user experience.

Server-side sessions can be revoked and can slide, so a long film never logs anyone out.

## Consequences

Web, PWA and Electron share one origin, so they share this cookie. Native apps will need bearer tokens later.
