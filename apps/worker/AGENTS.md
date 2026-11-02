# Worker

Runs jobs from the `jobs` table in SQLite. It publishes no ports, and SQLite is its only link to the API.

| File | Holds |
|---|---|
| `src/index.ts` | Startup: wait for the schema, recover, run the loop, shut down cleanly |
| `src/job-loop.ts` | The one job loop, with a handler per job type |
| `src/heartbeat.ts` | Keeps the file that the Compose health check reads young |
| `src/log.ts` | The `logger` |
| `src/ffmpeg.ts` | `runFfmpeg`, the one way to run ffmpeg |
| `src/transcode.ts` | The `transcode` handler |
| `src/scan.ts` | The `scan` handler, and what makes a scan fail |
| `src/tmdb.ts` | The only code that calls TMDB |
| `src/backup.ts` | The `backup` handler: writing and pruning files |
| `src/config.ts` | The only code here that reads the environment |

- ffmpeg runs only through `runFfmpeg`: an argument array and no shell. Never call `child_process` for it anywhere else.
- A new job type is a handler in `createHandlers` in `src/index.ts`. The compiler rejects a missing one.
- A handler rejects to fail its job, with a reason a user can read. It must stop when its `signal` aborts, and then reject, so that a clean shutdown can requeue the job.
- Every job ends as done or failed, with its reason. A failed run is not retried automatically, because a corrupt file fails the same way every time. Users retry through the API.
- Jobs must be safe to run again. A handler writes to its own temporary place, and moves its result into position only on success, so that a killed run leaves nothing that looks finished.
- Recovery runs at startup, and treats every `running` job as dead, so run one worker per database. Two workers claim jobs safely, but starting the second one requeues whatever the first is running.
- Never run migrations. Only the API does (ADR 0008), so startup waits for `isDatabaseMigrated`.
- The database is reached only through `@workspace/db`. Never import Drizzle or `better-sqlite3`.
- This app cannot reach sockets. The API polls for finished jobs and announces them.
- Log with `logger`, and name a job with `jobId` and `jobType` fields. `console` is only for a bad configuration, which comes before the logger.
- The loop beats only after a turn that could read the queue, so a health check sees a loop that is stuck as well as a process that is. Nothing here may block the event loop for a minute, because that looks the same.
- A job's reason can reach a browser, so it carries no paths or tokens from this machine.
- `scan` jobs and `backup` jobs have no title, and `queueJobWithoutTitle` allows one active of each. The schedule for backups lives in `queueDailyBackup`, not in a timer's memory, so that a restart changes nothing.

## Tests

- `test/` covers the wrapper, the loop, the scan and the backup directly, with a fake `ffmpeg` on the `PATH`, a fake handler or a fake `MovieLookup`.
- Behaviour across both processes belongs in `apps/api/test`, whose harness starts a real worker beside the API.
