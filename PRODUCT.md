# Product

<!-- impeccable:product-schema 1 -->

Written by `/impeccable init` on 2026-11-03, unattended. No one could be interviewed, so every fact below comes from `README.md`, `GLOSSARY.md`, `docs/PLAN.md` and `docs/adr/`. Facts marked _(inferred)_ are a reading of those documents that the maintainer has not confirmed. Unmarked facts are stated there directly. Visual direction is not recorded here: it lives in `docs/PLAN.md` section 9 and `DESIGN.md`.

## Platform

web

One static web app serves the browser, an installable PWA and an Electron shell from the same build ([ADR 0002](docs/adr/0002-vite-react-spa-replaces-nextjs.md)). The Electron shell loads the server's own pages, so the design language stays web.

## Users

- **People watching their own films at home.** Each is a user of one install, with a role of owner, admin or `user`. They browse the library and play a title, on a phone, a laptop or a large screen _(inferred: phone and desktop widths are required by `PLAN.md` Phase 2, large screens by the TV navigation decision E4)_.
- **The owner**, who installs ShowStream with Docker Compose on a home server, creates the first account in first-run setup, fills the library with a scan, and looks after backups and HTTPS. Usually the same person as one of the viewers _(inferred)_.
- **Contributors and design agents**, who build the app from `docs/PLAN.md` and need this file and `DESIGN.md` to ground their work.

## Product Purpose

ShowStream is a self-hosted media server that plays a library of movies in the browser, built to replace Jellyfin. It reads a media folder, matches each movie on TMDB, and streams it as HLS to any device on the owner's network or tailnet.

Success is the owner switching off Jellyfin: a typical `.mkv` H.265 file starts within seconds and seeks freely, on the web, as a PWA and on the desktop (`PLAN.md` Phase 4 "Done when").

## Positioning

- Self-hosted, with nothing sent to a third party except TMDB lookups by the worker. Fonts and assets are served by the install itself.
- One public entry over HTTPS, with the API as the only authority for auth and data ([ADR 0001](docs/adr/0001-single-public-entry-through-caddy.md), [ADR 0004](docs/adr/0004-api-owned-session-auth.md)).
- Simple to run: one Compose file, one SQLite database, no database server ([ADR 0005](docs/adr/0005-sqlite-replaces-mongodb.md)).
- One codebase for web, PWA and Electron, with mobile and TV wrappers later from the same static bundle.

## Operating Context

- The owner runs `docker compose up` on a home server or NAS host. The media folder may be on a NAS, and the database must stay on a local disk.
- Viewers open the app on their own devices over HTTPS, often in a dim room while watching _(inferred from the dark-first direction in `PLAN.md` section 9.1)_.
- Sessions last 30 idle days, so a long film never logs anyone out.
- Movies are folders named `Name (Year)` under `movies` in the media folder. Only `.mp4` is scanned today.

## Capabilities and Constraints

**Works today:** first-run setup, login and logout, a movie library, transcoding a title to HLS and playing it with seeking, notifications when a transcode finishes or fails, a retry for a failed transcode, scans started by an admin from Settings, and a daily database backup.

**Planned, in order** (`PLAN.md` section 12): the rebuilt web app and design system, PWA and Electron, real playback with direct play and on-demand transcoding, audio and subtitle tracks, resume, home and search, users and roles, TV shows, and later casting and SyncPlay.

**Constraints:**

- The API is the only authority for auth and data. Client-side guards are for the user's experience only.
- ffmpeg runs only in the worker.
- The web build is static files, with no server code.
- Everything works by keyboard, which prepares for TV remotes (open decision E4).
- Terms follow `GLOSSARY.md`: a title, not media; a movie, not a film; a transcode, not a conversion.

**Undecided:** how titles from TV shows will be presented, and whether a mobile or TV app comes before Phase 7 _(inferred as open from the roadmap)_.

## Brand Commitments

- The name is ShowStream, written as one word with two capitals.
- Apache-2.0, with a `NOTICE` that credits Sjoerd van Dis and must be kept on redistribution.
- No logo or mascot exists. Future work must not invent one without the maintainer.

## Evidence on Hand

- No real users, testimonials, benchmarks or screenshots of a real library exist. Future work must not fabricate any.
- Posters, backdrops and metadata come from TMDB at runtime. The repository holds no product imagery.
- `apps/web` is the shipped interface, which Caddy serves.

## Product Principles

1. **The library is the color.** Posters and backdrops carry the visual weight, so the interface stays out of their way.
2. **The owner's server, the owner's data.** Nothing depends on a third-party service at runtime except metadata lookups, and nothing is sent elsewhere.
3. **Playback first.** Starting and seeking a film quickly matters more than any other screen _(inferred from the Phase 4 framing)_.
4. **Honest status.** A transcode or scan shows what really happened, including failures and their reasons, never a false success.
5. **One codebase everywhere.** Every screen works at phone width, at desktop width and by keyboard.

## Accessibility & Inclusion

- Text meets WCAG AA contrast in both themes: 4.5:1 for text, 7:1 for foreground on background, and 3:1 for status colors (`PLAN.md` section 9.3, checked by a test).
- Full keyboard operation, with a visible focus ring, so that TV remotes can work later.
- A full light theme beside the dark default, following the system setting unless the user picks one.
