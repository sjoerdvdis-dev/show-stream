# Desktop

The Electron shell. It asks for a server's address, checks it, remembers it, and loads that server's own `apps/web` in its window. Everything after that, login, the library, the player and Settings, is the web app the server serves, with the same cookie session. `docs/PLAN.md` section 5.5 decides this.

| Path | Holds |
|---|---|
| `src/main.ts` | The main process: the window, its session, the navigation and permission rules, the menu, and the IPC handler for the setup page |
| `src/preload.ts` | Gives the setup page `window.showStream.connect`, and nothing to any other page |
| `src/address.ts`, `src/navigation.ts`, `src/server-check.ts`, `src/window-state.ts` | The rules, as plain functions with unit tests in `test/` |
| `src/settings.ts` | `settings.json` in the user data folder: the server's origin and the window's bounds |
| `setup/` | The setup page, the only local page, on `@workspace/ui`'s tokens and primitives |
| `electron-builder.yml` | Packaging: an NSIS installer on Windows, an AppImage on Linux, in `release` |

- **Thin shell, no product logic.** A feature belongs in `apps/web`, which every client gets. The shell owns only what a browser would: the address, the window and the menu.
- **Never loosen the security settings.** `contextIsolation`, `sandbox` and `webSecurity` stay on, `nodeIntegration` off, and `app.enableSandbox()` stays. The server's pages are remote code, and must never reach Node. No `certificate-error` handler, `setCertificateVerifyProc` or switch that skips certificate checks: a user trusts their server's CA in the OS, as for a browser.
- The preload exposes one function, only on the `file:` setup page, and the main process checks that the sender is that page. Add nothing to it for the server's pages. A sandboxed preload can load no other file, so it imports only types and `electron`.
- Navigation, redirects and new windows go through `navigationRule`: the chosen origin stays in the window, other `https:` links open with `shell.openExternal`, and anything else is denied. Change the rule there, with its tests, never by adding exceptions in `main.ts`.
- Permission requests are denied except `fullscreen` from the chosen server. Media keys reach the player through the Media Session API, which needs no permission.
- `http://` is refused except to `localhost` and `127.0.0.1`. The check asks `GET /api/auth/setup` through the window's session and validates it with the contract's schema, so a certificate the OS does not trust fails there first.
- The window's session is the persistent partition `persist:showstream`, which keeps the session cookie across restarts. Change Server forgets only the address.
- Vite bundles the main process and the preload into `dist` as CommonJS with every dependency inside, so the app needs no `node_modules`, and builds the setup page into `dist/setup` with relative paths, because it loads from a `file:` URL. Everything here is a dev dependency for that reason.
- `--user-data-dir=<folder>` gives a separate profile, which the browser test uses. `--suggest-server=<address>` fills the setup page when no server is saved, which `pnpm dev` uses for `http://127.0.0.1:5173`.
- `apps/e2e/tests/native-app.spec.ts` drives the built app through Caddy, in `pnpm test:browser`. Electron's binary downloads on first use, not at install: `pnpm dev` and `run.sh` trigger it.
- `pnpm turbo package --filter=desktop` builds, then packages for the computer it runs on: Windows makes the NSIS installer and Linux the AppImage. A Windows installer cannot be made on Linux without Wine. `.github/workflows/desktop.yml` builds both, on their own runners, and uploads them as artifacts. It is not a required check.
- The icon is `apps/web/public/icon-512.png`, the PWA's, for the installers and, through `dist/icon.png`, the window. Change it there, never with a copy here.
- Nothing is signed, and no secret is needed. Do not add signing, auto-update or a publish target without a decision in `docs/PLAN.md`: each needs secrets or a release channel.
- Keep `appImage.executableArgs` empty. electron-builder's default adds `--no-sandbox` to the AppImage's menu entry, which turns off Chromium's sandbox for every page.
- Everything the app runs is in `dist`, so `files` takes only `dist` and `package.json`, and there is no native module to rebuild. A runtime dependency would have to be bundled by Vite, not shipped in `node_modules`.
