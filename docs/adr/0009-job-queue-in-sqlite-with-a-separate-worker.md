# Jobs live in SQLite, and a separate worker runs them

ffmpeg ran inside the API, so one bad file could take the server down, and nothing survived a restart. `apps/worker` is now a separate process that claims jobs from the `jobs` table and runs ffmpeg through a `spawn` wrapper, because SQLite is already there and a queue needs no Redis or `pg-boss`. The two processes share only the database: the API queues jobs and polls for finished ones to announce, and the worker has no ports and no internal route.

## Considered Options

An internal HTTP route from the worker to the API would announce a finished job at once, but it adds a network path and a credential to protect. Polling costs up to half a second of delay.

## Consequences

SQLite has one writer at a time, so these writes stay short, and any transaction that reads before it writes must be `immediate`. The file must stay on a local disk that both containers share. Recovery treats every `running` job as dead at startup, so there is one worker per database, and the queue cannot spread across hosts.
