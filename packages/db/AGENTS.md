# Database

The only code that touches Drizzle or `better-sqlite3`. Apps call the functions in `src/index.ts`.

| File | Holds |
|---|---|
| `src/schema.ts` | Tables, and the types inferred from them |
| `src/connection.ts` | `openDatabase`, the one way to open the file, and `migrateDatabase` |
| `src/users.ts`, `src/sessions.ts`, `src/media.ts`, `src/jobs.ts`, `src/settings.ts` | Repository functions |
| `migrations/` | Generated SQL. It ships in the API and worker images |

- Change the schema, then run `pnpm --filter @workspace/db generate` and commit the result. Never edit a migration that has been applied.
- A data change has no schema diff, so generate an empty file with `generate --custom --name <name>` and write its SQL. Write no other migration by hand.
- Add a table with the feature that uses it. No empty tables.
- Infer types from the schema. Do not write a row type by hand.
- Repository functions take the `Database` as their first argument and are synchronous, like the driver.
- End an insert with `RETURNING` in `.all()`, not `.get()`. `.get()` stops at the first row, so SQLite commits without running the WAL checkpoint, and a connection doing only those writes grows the WAL for ever.
- Only the API runs `migrateDatabase`. Anything else that opens the file waits for `isDatabaseMigrated`.
- The API and the worker write to one file. A write is one statement, or a transaction with `{ behavior: 'immediate' }`. A deferred transaction that reads before it writes fails at once if the other process wrote in between, and the busy timeout does not help it.
- Keep the file on a local disk, never NFS or SMB. Copying a live WAL database is not a backup.
