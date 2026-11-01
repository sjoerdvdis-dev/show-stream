# Worker

Runs jobs from the `jobs` table in SQLite. It publishes no ports, and SQLite is its only link to the API.

| File | Holds |
|---|---|
| `src/index.ts` | Startup: wait for the schema, recover, run the loop, shut down cleanly |
| `src/job-loop.ts` | The one job loop, with a handler per job type |
| `src/ffmpeg.ts` | `runFfmpeg`, the one way to run ffmpeg |
| `src/transcode.ts` | The `transcode` handler |
| `src/config.ts` | The only code here that reads the environment |

- ffmpeg runs only through `runFfmpeg`: an argument array and no shell. Never call `child_process` for it anywhere else.
- A new job type is a handler in `handlers` in `src/index.ts`. The compiler rejects a missing one.
- A handler rejects to fail its job, with a reason a user can read. It must stop when its `signal` aborts, and then reject, so that a clean shutdown can requeue the job.
- Every job ends as done or failed, with its reason. A failed run is not retried automatically, because a corrupt file fails the same way every time. Users retry through the API.
- Jobs must be safe to run again. A handler writes to its own temporary place, and moves its result into position only on success, so that a killed run leaves nothing that looks finished.
- Recovery runs at startup, and treats every `running` job as dead, so run one worker per database. Two workers claim jobs safely, but starting the second one requeues whatever the first is running.
- Never run migrations. Only the API does (ADR 0008), so startup waits for `isDatabaseMigrated`.
- The database is reached only through `@workspace/db`. Never import Drizzle or `better-sqlite3`.
- This app cannot reach sockets. The API polls for finished jobs and announces them.

## Tests

- `test/` covers the wrapper and the loop directly, with a fake `ffmpeg` on the `PATH` or a fake handler.
- Behaviour across both processes belongs in `apps/api/test`, whose harness starts a real worker beside the API.
