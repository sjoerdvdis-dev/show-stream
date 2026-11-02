# Logger

The one log format, used by the API and the worker.

- `createLogger` writes JSON to stdout, one object per line, and never to a file. Docker keeps and rotates the logs.
- Pass facts as fields, not in the message: `logger.info('Started job', { jobId, jobType })`. An `Error` in a field keeps its message and stack.
- Apps create one logger from their own config, because only `config.ts` reads the environment. `console` is only for what happens before that logger exists.
- A log line reaches whoever reads `docker compose logs`, so it never holds a token or a password.
