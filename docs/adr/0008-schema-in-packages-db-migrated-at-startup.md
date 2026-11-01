# The schema lives in packages/db and migrates at API startup

`packages/db` owns the schema, the generated migrations, the connection setup and every query, because the API and the worker share them and no app may depend on Drizzle's pre-1.0 API. The API applies migrations before it listens, and a failed migration stops it, so upgrading is a restart.

A title has its own primary key with a unique `(type, tmdb_id)`, so a movie and a show can share a TMDB ID and a file can have no match. Fields we filter on are typed columns, and the TMDB payload stays as JSON. Transcode state is a row in `jobs`, linked to its title by a nullable `media_id`, because a job such as a scan has no title.

## Consequences

An applied migration can never be edited. Every install runs each migration once, in order, inside the API process, so the worker must not start migrating too. Routes still use TMDB IDs for now, so a title with no TMDB ID cannot be reached by them until Phase 2 moves them.
