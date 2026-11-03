# Contributing to ShowStream

## Before you start

- ShowStream is moving to a new architecture. Read [the plan](./docs/PLAN.md) and the [decisions](./docs/adr/README.md) before structural work.
- `apps/next-client` is being replaced by `apps/web`, so do not add features to it.
- Report vulnerabilities [privately](./SECURITY.md), not in an issue.
- Everyone here follows the [code of conduct](./CODE_OF_CONDUCT.md).

## Set up

Fork or clone the repo, then run:

```bash
./scripts/setup.sh
```

It needs Node.js 26. Everything else it installs itself. `pnpm dev` runs the API, the worker and both clients, and it and `pnpm test` need no Docker. The full stack and the browser tests do, and setup says so if it is missing. To run the apps, see the [local development guide](./docs/guides/local-development.md).

## Make a change

1. Pick an issue, or open one first for anything large. Issues labelled `ready-for-agent` or `ready-for-human` are ready to start.
2. Branch from `main`, named `type/short-description`, such as `fix/seek-crash`.
3. Commit as `type: summary`, in the imperative. Types in use are `feat`, `fix`, `refactor`, `test`, `build`, `chore`, `ci` and `docs`.
4. Run the checks:

   ```bash
   pnpm turbo check-types lint build test
   ```

5. Open a pull request to `main`. The template asks for evidence and what you did not test.

### Interface work

The design system is in `packages/ui`: the theme in `src/styles/tokens.css`, shadcn primitives on Base UI in `src/components`, and the product patterns in `src/patterns`. To add a primitive, run `pnpm dlx shadcn@latest add <name>` from `packages/ui`, then follow [its AGENTS.md](./packages/ui/AGENTS.md). To change the theme, paste or edit the variables in `tokens.css` and run `pnpm --filter @workspace/ui test`. Under `pnpm dev`, <http://127.0.0.1:5173/dev/components> shows every color, primitive and pattern, in both themes.

`main` only accepts pull requests that pass the `check` job. The `audit` and `browser` jobs only report, so they do not block a merge.

## Definition of done and project rules

Both are in [AGENTS.md](./AGENTS.md), which people and agents follow alike.

## Working with Claude Code

Skills, agents and the MCP server configuration come with the clone. The usual path is `/grill-with-docs`, `/to-spec`, `/to-tickets`, then `/implement`. If you are unsure which skill fits, use `/ask-matt`. The full list is in [the plan](./docs/PLAN.md#105-how-we-develop).

## Licence

Contributions are licensed under [Apache-2.0](./LICENSE), the same as the project. There is no CLA.
