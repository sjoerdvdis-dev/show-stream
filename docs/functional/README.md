# Functional designs

ShowStream's first version is scoped from what Jellyfin does. This folder holds three things, made in this order:

| Step | Output | Location |
|---|---|---|
| 1. Archive | What Jellyfin does in each area, its processes and the decisions behind them | `jellyfin/<nn>-<area>.md` |
| 2. Pruning | Every functionality marked Keep, Later or Drop by the maintainer | The Scope column in each archive file, collected in `scope.md` |
| 3. Design | ShowStream's own functional design per area, built from what was kept | `<area>.md` |

Steps 1 and 2 come first in [PLAN.md](../PLAN.md): nothing in Phase 4's kit or Phase 5 is scoped until they are done.

## Pinned scope

- **The first version is movies.** It is what Phases 4 to 6 deliver: a household logs in, browses and searches its movies, and plays them, with their tracks, on the web, the PWA and the desktop app.
- **TV shows come right after the first version**, in Phase 7. They are not archived or designed now, but nothing designed now may rule them out: a concept that shows will share, such as a title, a track or watch progress, is designed so that an episode can be one.
- **Eight areas are archived**, listed below. The rest wait for the version that needs them.

[ADR 0012](../adr/0012-first-version-scoped-from-jellyfin-movies-only.md) records these.

## Pinned version

The archive describes **Jellyfin v12.4**, released 2026-10-26, the latest stable release when the archive began:

| Source | Pinned at |
|---|---|
| Server, [jellyfin/jellyfin](https://github.com/jellyfin/jellyfin/tree/v12.4) | Tag `v12.4` |
| Web client, [jellyfin/jellyfin-web](https://github.com/jellyfin/jellyfin-web/tree/v12.4) | Tag `v12.4` |
| Docs, [jellyfin/jellyfin.org](https://github.com/jellyfin/jellyfin.org/tree/38b0cda4ad0f2a43662aea94f026decf8a5b4990/docs/general), published at [jellyfin.org/docs](https://jellyfin.org/docs/) | Commit `38b0cda`, of 2026-11-17. The docs have no release tags, so they are pinned by commit |
| Reference instance | The official Jellyfin container image at 12.4, run locally with a few sample movies, to see screens and check behavior |

Every source link points at its pin, so a link never moves. The archive is a snapshot, like `audits/`: it is not updated to later releases. A later release worth knowing about gets a dated note in the area's file, never a rewrite.

## Rules

- **Functional only.** Describe what Jellyfin does and why, in our own words. No code, no API fields, no class names beyond the source link. Jellyfin is GPL-2.0 and ShowStream is Apache-2.0, so nothing is copied, only described.
- **Every claim has a source**, a link at the pinned tag to the code, the docs or the screen that shows it. A claim found only in docs is marked *documented*. One read from the code is marked *in code*. One seen on the reference instance is marked *observed*, with the steps. One guessed is marked *inferred* and listed under open questions.
- **Sources in this order:** the server's API controllers, which list everything the server can do, then the server code behind them, the web client's pages and settings, the [official docs](https://jellyfin.org/docs/), and last, first-party plugins. Forum posts and third-party write-ups only point to where to look.
- **Neutral.** The archive says what Jellyfin does, not whether ShowStream should. Judgement belongs in the Scope column and in step 3.
- **Use ShowStream's words** from [GLOSSARY.md](../../GLOSSARY.md) where a concept exists in both, and note Jellyfin's own term beside it, such as *title* (Jellyfin: *item*).

## Areas for the first version

The first version is a streaming MVP: a household plays its own movies, in the browser, the PWA and the desktop app, and it starts and seeks quickly. Only the areas it needs are archived now:

| # | Area | Covers | Why it is in |
|---|---|---|---|
| 01 | Users and access | Users, administrators, the permissions a user can have, logging in, sessions, devices, the first-run wizard | Every request is a user's |
| 02 | Libraries and scanning | Library types and folders, file naming rules, scanning, refreshing, file watching, a missing or moved file | Nothing plays without a library |
| 03 | Metadata | Metadata providers, images, identifying and fixing a match, locked fields, local metadata files, people | A library is browsed by its metadata |
| 04 | Browsing, home and search | The home screen and its sections, library views, filters and sorting, search, played state, resume points, favorites | How a user finds something to watch |
| 05 | Playback | How a client and the server agree how to play a file: direct play, direct stream, remux or transcode, device profiles, bitrate limits, playback sessions, progress reports and resume | The decision that makes a file start quickly |
| 06 | Transcoding and streaming | The ffmpeg pipeline, HLS on demand, seeking in a stream, hardware acceleration, throttling, the transcode cache and its cleanup | How a file that cannot be played directly is played anyway |
| 07 | Audio and subtitle tracks | Choosing tracks, language preferences, embedded and external subtitles, subtitle formats, burning in, downloading subtitles | Playing a typical `.mkv` means choosing among its tracks |
| 08 | Administration | The dashboard, scheduled tasks, the activity log, server logs, backups, the basic server settings | Running an install without a shell |

**Left out of the first set:** TV shows, music, books and audiobooks, photos and home videos, collections and playlists, Live TV and DVR, SyncPlay, casting, remote control and DLNA, trickplay, chapters and media segments, notifications, plugins, parental controls beyond what 01 needs, Quick Connect, networking and branding, and Jellyfin's own clients. Each is archived when a later version is scoped. Where an area above touches one of them, it says so in one line and goes no further.

## Where to look, per area

The entry points at the pins. Paths are relative to each repository; the docs are under `docs/general/`.

| Area | Server: API | Server: behavior | Web client | Docs |
|---|---|---|---|---|
| 01 Users and access | `Jellyfin.Api/Controllers/`: `UserController`, `StartupController`, `SessionController`, `DevicesController`, `ApiKeyController` | `MediaBrowser.Model/Users/UserPolicy.cs`, user configuration | Dashboard `users/`, `devices/`, `keys/`; the startup wizard; user `settings/`, `userprofile` | `server/users/`, `post-install/setup-wizard.md`, `server/devices.md` |
| 02 Libraries and scanning | `LibraryStructureController`, `LibraryController` | `Emby.Naming/` (`Video/VideoResolver.cs`, `StackResolver.cs`, `ExtraRuleResolver.cs`, `Common/NamingOptions.cs`), `Emby.Server.Implementations/Library/`, `IO/LibraryMonitor.cs`, the `RefreshMediaLibraryTask` | Dashboard `libraries/` | `server/libraries.md`, `server/media/movies.md` and its `_video-*` parts, `excluding-directory.md`, `placeholders.md` |
| 03 Metadata | `ItemLookupController`, `ItemRefreshController`, `ItemUpdateController`, `RemoteImageController`, `ImageController`, `PersonsController` | `MediaBrowser.Providers/` (`Plugins/Tmdb/Movies/`, OMDb), `MediaBrowser.LocalMetadata/`, `MediaBrowser.XbmcMetadata/` (`Parsers/MovieNfoParser.cs`) | Dashboard `libraries/metadata`, `libraries/nfo`; the item's identify, edit metadata and edit images dialogs | `server/metadata/` (`index`, `identifiers`, `nfo`), `server/media/_metadata-images.md` |
| 04 Browsing, home and search | `ItemsController`, `UserLibraryController`, `UserViewsController`, `FilterController`, `SearchController`, `SuggestionsController`, `MoviesController`, `GenresController`, `StudiosController`, `YearsController`, `PlaystateController`, `DisplayPreferencesController` | User data: played state, resume, favorites | `src/apps/modern/routes/`: `home`, `movies/`, `search`, `user/display/`; item details | `server/libraries.md` (display) |
| 05 Playback | `MediaInfoController` (playback info), `VideosController`, `PlaystateController`, `SessionController` | `MediaBrowser.Model/Dlna/StreamBuilder.cs`, `DeviceProfile.cs`; the web client's device profile builder | `src/apps/modern/routes/video/`, user playback settings; dashboard `playback/resume`, `playback/streaming` | `clients/codec-support.md`, `post-install/transcoding/index.mdx` |
| 06 Transcoding and streaming | `DynamicHlsController`, `HlsSegmentController` | `MediaBrowser.MediaEncoding/` (`Transcoding/TranscodeManager.cs`, the encoder), `Jellyfin.Api/Helpers/` streaming helpers, the `DeleteTranscodeFileTask` | Dashboard `playback/transcoding` | `post-install/transcoding/` with `hardware-acceleration/` and `downmix.md`, `administration/hardware-selection.md` |
| 07 Audio and subtitle tracks | `SubtitleController`, `VideoAttachmentsController` | `MediaBrowser.MediaEncoding/Subtitles/`, `MediaBrowser.Providers/` subtitle search | User subtitle and playback settings, the player's track menus | `server/media/_video-external-streams.md`, `server/plugins/open-subtitles.md` |
| 08 Administration | `SystemController`, `ConfigurationController`, `DashboardController`, `ScheduledTasksController`, `ActivityLogController`, `BackupController` | `Emby.Server.Implementations/ScheduledTasks/Tasks/`, `Jellyfin.Server.Implementations/FullSystemBackup/` | Dashboard `index`, `settings/`, `tasks/`, `activity/`, `logs/`, `backups/` | `server/settings.md`, `server/tasks.md`, `administration/` (`backup-and-restore`, `configuration`, `storage`, `troubleshooting`) |

The API's full list comes from the reference instance, which serves its OpenAPI description, so no controller is missed.

## How the work runs

1. **One area at a time per researcher, in parallel.** Each area is one research run with a fresh context, through the `research` skill: it reads the area's entry points above in the order the rules give, and writes `jellyfin/<nn>-<area>.md` to the template below. Areas 01 to 03 go first, because the others lean on users, titles and metadata, then 04 to 08 together.
2. **A check per area.** A second run with a fresh context takes ten claims at random and checks each against its source, and checks every process step for a source. A wrong claim sends the file back.
3. **The reference instance answers what reading cannot.** Anything marked *inferred* is tried on it, and becomes *observed* with the steps that showed it, or stays an open question.
4. **A suggested scope, for speed.** Each file gets a **Suggested** column beside Scope, filled from [PRODUCT.md](../../PRODUCT.md) and the pinned scope above, with a few words of reason. It is a suggestion only: the maintainer's Scope is what counts.
5. **Pruning, one area per session**, as below, with the maintainer, area 01 first.
6. **ShowStream's design per area**, through `/grill-with-docs`, which also updates `GLOSSARY.md` and the ADRs as terms and decisions settle.

## Template for an archive file

Each file in `jellyfin/` has these sections, in this order:

1. **Purpose.** What the area is for, in a paragraph.
2. **Concepts.** Each concept, what it holds and its states, with Jellyfin's term and ours.
3. **Functionalities.** One table row each:

   | ID | Functionality | Who | What it does | Source | Suggested | Scope |
   |---|---|---|---|---|---|---|
   | 05.03 | Direct play | Any user | The client plays the original file as it is, when it can decode the container and every chosen track | *in code*, link | Keep: the fastest start | |

   IDs are `<area>.<nn>` and never reused. Scope stays empty until pruning.
4. **Processes.** The flows a user or the server goes through, as numbered steps with who does each, such as *add a library and scan it* or *press play until the first frame*. These are what ShowStream needs to design too.
5. **Design decisions.** What Jellyfin chose where it had a choice, what it gives up, and how it shows, in one row each: decision, alternatives, consequence, source.
6. **Settings.** The settings that change the area's behavior, with their default, and who may change them.
7. **Links.** Where this area depends on another, by area and functionality ID.
8. **Open questions.** Everything marked *inferred*, and anything the sources left unclear.

An area is done when every section is filled, every functionality has a source, and a second reader has checked a sample of the sources against the claims.

## Pruning

The maintainer goes through one area at a time and fills each functionality's Scope:

- **Keep:** in ShowStream's first version.
- **Later:** wanted, after the first version. Note which phase if known.
- **Drop:** not wanted in ShowStream, with a one-line reason.

A process is kept when the functionalities it needs are. A design decision is marked *adopt*, *differ* or *not relevant*, with a line on why where we differ. `scope.md` collects the result: the kept functionalities and processes per area, and every Drop with its reason, so that a later question of "why can't it do X" has an answer.

Pruning is done when every row in every area has a Scope. It then updates [PLAN.md](../PLAN.md): the feature list in section 13, the pages in section 4.5, and the phases that hold them.

## ShowStream's functional designs

Once an area is pruned, its ShowStream design goes in `<area>.md` here, built from what was kept, with these sections:

1. **Purpose**, for ShowStream's users, from [PRODUCT.md](../../PRODUCT.md).
2. **Concepts and states**, in ShowStream's terms, each added to `GLOSSARY.md` through `/domain-modeling`.
3. **Capabilities**, as user stories by role, each naming the archive IDs it comes from. This is also what the API enforces.
4. **Processes**, as numbered steps, the kept ones from the archive in ShowStream's terms.
5. **Rules**, such as limits, defaults and what happens at an edge.
6. **Where we differ from Jellyfin**, and why. A hard-to-reverse one becomes an ADR.
7. **Pages**, which pages show the area and what each needs, which feeds the route list in `PLAN.md` section 4.5 and the kit's inventory.
8. **Ready for shows**, how each concept will take TV shows in Phase 7.
9. **Out of scope** and **open questions**.

Specs in GitHub Issues then build on these designs.
