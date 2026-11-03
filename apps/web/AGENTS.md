# Web

The static React SPA that replaces `apps/next-client`. `pnpm dev` serves it beside Next, and Caddy moves to it in Phase 2 item 7.

| Folder          | Holds                                                                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/`   | File-based routes. Thin: guards and wiring only. `_app` is the signed-in layout                                                                                                        |
| `src/features/` | `auth`, `library` and `player`, and `dev` for `/dev/components`                                                                                                                        |
| `src/lib/`      | The API client, the query client, the socket, the theme provider, `devOnly` for dev-only routes, `RouterLink` for the patterns, and `app.tsx`, which wires the router and query client |
| `test/`         | Vitest with `@testing-library/react` and `msw`, on the real router and query client                                                                                                    |

- API access goes only through `api` in `src/lib/api.ts`. The one path written by hand is the socket's, in `src/lib/socket.ts`. The player uses the `playlistUrl` the API answers with, which is under `/streams`, never `/api/streams`.
- Forms validate with schemas from `@workspace/contract`, as `endpoints.login.body`, never with local copies.
- Guards are for the user's experience. The API checks every request.
- A protected route is a child of `_app`, which also keeps the socket open, so nothing connects without a session.
- A data call goes through TanStack Query, so that a 401 reaches `onSessionLost` in `src/lib/app.tsx`, the one path back to login. Anything else that can see a 401, such as `hls.js`, calls the same function. Login and setup call the API directly, because a 401 there is a wrong password.
- `redirect` on `/login` only ever holds what `toReturnPath` returns. Add any new path the API serves to its list.
- ffmpeg, Node APIs and server code do not belong here. The build is static files, and the Vite proxy exists only under `pnpm dev`.
- `src/routeTree.gen.ts` is generated and committed. Vite rewrites it when routes change, so do not edit or format it.
- UI comes from `@workspace/ui`: the stylesheet, `@workspace/ui/tokens.css`, and the shadcn primitives on Base UI, as `@workspace/ui/components/button`. Use a pattern from `@workspace/ui/patterns/*` before a primitive, and a primitive before writing an element by hand. Nothing from Radix or `next-themes`. `components.json` shares `style`, `iconLibrary`, `baseColor`, `rsc` and the `ui` and `utils` aliases with the one in `packages/ui`, so `shadcn add` from here puts primitives there.
- Colors come from the tokens, as `bg-card` or `text-muted-foreground`. `test/no-raw-colors.test.ts` fails on a raw color, such as `text-red-500`, `bg-black` or a hex value. `DESIGN.md` at the root says which token does what.
- The theme is `useTheme` from `src/lib/theme.tsx`, which puts the `dark` class on `<html>`. The script in `index.html` applies it before first paint with the same storage key, so change both together. The `Toaster` primitive takes its `theme` from it.
- Patterns navigate through `RouterLink` in `src/lib/router-link.tsx`, which the root route gives `LinkProvider`. The signed-in layout in `_app.tsx` is `AppShell`, and decides which navigation item is active. A pattern that can see a 401, such as `VideoPlayer`, gets `onSessionLost` from the route context.
- `/dev/components` shows every token, primitive and pattern from fixture data, with a theme switch, and only `pnpm dev` serves it. Its player plays a prepared title by its TMDB id, through `/streams`, so it needs a session. A dev-only route takes `beforeLoad: devOnly`, which answers not found in a build, and picks its component with `import.meta.env.DEV` written in the route file, so that Vite drops the page from the build. One that renders primitives imports its page lazily, because Base UI has top-level code that a static import keeps in the build.
- `src/index.css` ends every animation and transition at once under reduced motion, and the primitives rely on it, so a new app must copy that rule.
- Everything works by keyboard and at phone width, in dark and light. Verify UI changes in a browser.
- Tests act as a user does and check what a user sees, not query keys or router state. `apps/api/test` proves the API client, so do not repeat that here.
