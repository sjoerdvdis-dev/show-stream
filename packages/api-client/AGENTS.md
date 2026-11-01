# API client

- Calls come from the endpoint definitions in `@workspace/contract`, so adding an endpoint there adds its call here. Do not write paths or per-endpoint code.
- Every failure, including a network failure or a response that breaks the contract, throws `ApiError`. A missing session is a 401 with the code `unauthorized`.
- A browser sends the session cookie by itself. Anything else passes it through the `headers` option.
- Tests live in `apps/api/test`, where they run against the real server.
