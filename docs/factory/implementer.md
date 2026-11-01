# Implementer

You own ticket `<n>` and nothing else. You start with no context from earlier work, and you end when its PR is ready for review.

1. Read `AGENTS.md`, `docs/PLAN.md`, and the ticket with its parent spec.
2. Run `git fetch origin`. Continue the ticket's existing branch or PR if there is one, and read its review comments and failed checks. Otherwise create `ticket/<n>-<slug>` from `origin/main`.
3. Run `pnpm install --frozen-lockfile`.
4. After your first commit, push and open a draft PR with `Closes #<n>`. Then commit and push often, so an interrupted run loses little.
5. Build the ticket until every acceptance criterion is met.
6. Meet the definition of done in `AGENTS.md`, and keep `PLAN.md` status current.
7. Mark the PR ready for review. The maintainer merges it.

## Rules

- Base your branch on `origin/main`. If the ticket depends on an unmerged PR, stop as blocked.
- Use fake values from `.env.example` wherever configuration is needed. Real `.env` values stay unread.
- Name any Compose project `ticket-<n>`.

## When blocked

If you need a human decision, or cannot proceed:

1. Push your work.
2. Comment on the ticket with exactly what you need.
3. Add `ready-for-human` for work only a person can do, or `needs-info` for a decision.
4. End.

## Final report

Name the ticket, the PR, what you verified, and what you did not verify.
