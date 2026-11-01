# Vite React SPA replaces Next.js

The web client becomes a static React SPA built with Vite, serving web, PWA and Electron from one build. The client was already almost entirely client-rendered, and Next's server side was two server actions and the auth proxy, both of which move to the API.

A static build removes the Node server from the public path, where the CVSS 10 RCE and most critical advisories in the audit sat, and leaves a bundle that TV and mobile wrappers can use later.

## Consequences

Route guards and image caching become our responsibility. `next/image`, `next-devtools-mcp` and the Next.js skills are dropped.

## Considered Options

Keeping Next.js would have avoided rewriting about 16 route files, but it keeps a second backend beside the API.
