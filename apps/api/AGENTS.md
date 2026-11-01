# API

These rules are the target. Phase 1 brings the existing routes in line, so apply them to every route you add or change.

- Every route validates its input with `@workspace/contract`.
- Every route requires auth through the shared middleware. Public routes are an explicit allowlist.
- Every error uses the one error shape in the contract.
- ffmpeg belongs in the worker. Code here that calls it today moves there in Phase 1 item 8.
