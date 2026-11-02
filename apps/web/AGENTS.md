# Web

The static React SPA that replaces `apps/next-client`. `pnpm dev` serves it beside Next, and Caddy moves to it in Phase 2 item 7.

| Folder | Holds |
|---|---|
| `src/routes/` | File-based routes. Thin: guards and wiring only. `_app` is the signed-in layout |
| `src/features/` | `auth`, `library` and `player` |
| `src/lib/` | The API client, the query client, the socket, and `app.tsx`, which wires the router and query client |
| `test/` | Vitest with `@testing-library/react` and `msw`, on the real router and query client |

- API access goes only through `api` in `src/lib/api.ts`. The one path written by hand is the socket's, in `src/lib/socket.ts`. The player uses the `playlistUrl` the API answers with, which is under `/streams`, never `/api/streams`.
- Forms validate with schemas from `@workspace/contract`, as `endpoints.login.body`, never with local copies.
- Guards are for the user's experience. The API checks every request.
- A protected route is a child of `_app`, which also keeps the socket open, so nothing connects without a session.
- A data call goes through TanStack Query, so that a 401 reaches `onSessionLost` in `src/lib/app.tsx`, the one path back to login. Anything else that can see a 401, such as `hls.js`, calls the same function. Login and setup call the API directly, because a 401 there is a wrong password.
- `redirect` on `/login` only ever holds what `toReturnPath` returns. Add any new path the API serves to its list.
- ffmpeg, Node APIs and server code do not belong here. The build is static files, and the Vite proxy exists only under `pnpm dev`.
- `src/routeTree.gen.ts` is generated and committed. Vite rewrites it when routes change, so do not edit or format it.
- Do not import `@workspace/ui` yet, or anything from Radix or `next-themes`. Until Phase 2 items 2 to 4 add tokens and patterns, screens use plain Tailwind, and the thin screens stay plain, because item 6 replaces them. After that: patterns before new UI, and no raw colors.
- Everything works by keyboard and at phone width, in dark and light. Verify UI changes in a browser.
- Tests act as a user does and check what a user sees, not query keys or router state. `apps/api/test` proves the API client, so do not repeat that here.
