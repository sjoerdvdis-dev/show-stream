# ShowStream

A self-hosted media server that plays a library of movies in the browser, and is intended to replace Jellyfin. These terms describe what exists today, so features still on the roadmap are left out.

## Language

### People and access

**User**:
A person who can log in to an install. Each has one role: owner, admin or `user`, the last being the role with the fewest rights.
_Avoid_: Account

**Owner**:
The one user that first-run setup creates. An owner has every right an admin has.

**Admin**:
A user whose role may start a scan and read its result. Nothing in the app grants this role yet, so an install normally has only its owner.

**First-run setup**:
The step that creates the owner on a new install, and closes once an owner exists. It is not `scripts/setup.sh`, which prepares a development clone.

**Session**:
A user's logged-in state, which logging in starts and logging out ends. It lapses after 30 days without use.

### Library

**Library**:
The titles an install knows, which scans fill.

**Media folder**:
The folder that holds the videos scans read, and the cache of streams, posters and backdrops.
_Avoid_: Media library

**Title**:
One entry in the library, with its TMDB metadata. Today every title is a movie: a `show` type exists, but nothing creates one.
_Avoid_: Media

**Movie**:
A title of type `movie`, found as a `Name (Year)` folder under `movies` in the media folder.
_Avoid_: Film

**Video**:
The `.mp4` file in a title's folder, which a transcode reads.

**Stream**:
The HLS playlist and segments of a title, which the API serves once its transcode has finished.

### Background work

**Worker**:
The separate process that runs jobs, and the only place ffmpeg and TMDB calls run.

**Job**:
One piece of work the worker takes from the queue: a transcode, a scan or a backup. It is `queued`, `running`, `done` or `failed`.

**Transcode**:
The job that turns a title's video into its stream. Today it copies the whole video into HLS before playback, without re-encoding it.
_Avoid_: Conversion

**Transcode status**:
What the API reports for a title, derived from its transcode job: `not ready`, `in progress`, `ready` or `failed`.
_Avoid_: API status

**Scan**:
The job that looks up each movie folder on TMDB and saves a title for each match, with its poster and backdrop. An admin starts it.
_Avoid_: Rescan

**Backup**:
A daily, dated copy of the database, and the job that makes it. The latest 7 are kept, and they hold no videos or streams.

**Retry**:
A user asking for a failed transcode to run again. Nothing retries a failure automatically.

**Recovery**:
What the worker does at startup with jobs it finds `running`: it requeues them as interrupted, and fails any that have had 3 attempts.

**Notification**:
A message the API sends over a socket to the users who asked for a transcode, when it finishes.
_Avoid_: Event

### System

**API**:
The service that owns authentication and data, and is the only authority on both.
_Avoid_: Backend

**Public entry**:
The one service published to the network, which is Caddy.
_Avoid_: Public proxy, proxy

**TLS mode**:
How the public entry gets its certificates: `internal`, `public` or `tailscale`.
_Avoid_: HTTPS mode

**Contract**:
The single definition of every API endpoint and its data, which the API serves and clients call.

### Planning

**Phase**:
A numbered part of the roadmap in `docs/PLAN.md`, each ending with a working app.
_Avoid_: Stage

**Active phase**:
The first phase whose "Done when" criteria are not met.

**Spec**:
A GitHub issue that describes one unit of the plan, and that tickets are cut from.

**Ticket**:
A GitHub issue for one piece of work, with acceptance criteria.
_Avoid_: Issue

**Maintainer**:
The person who runs the project. This is not the owner, who is a user of one install.
