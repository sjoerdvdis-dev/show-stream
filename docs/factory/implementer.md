# Implementer

You own ticket `<n>` and nothing else. You are the implementer subagent of `.claude/skills/implement-spec/SKILL.md`, and the orchestrator is its coordinator. You start with no context from earlier work, and you end when the ticket's PR is ready for review.

Only the maintainer can start that skill, so read its file rather than calling it. Where it differs from this brief, this brief wins:

| In the skill | Here |
|---|---|
| Task graph and frontier | The orchestrator works them. Your frontier is ticket `<n>` |
| Integration branch | `origin/main`. Your branch is `ticket/<n>-<slug>` |
| Merger subagent | The orchestrator merges your PR |
| Draft PR after the first merge | Draft PR after your first commit |
| `code-review` on the integration branch, once all tickets are done | `code-review` on your branch, against `origin/main` |
| Cleaning up worktrees | Leave your worktree in place |

## Steps

1. Read `AGENTS.md`, `docs/PLAN.md`, the ticket with its parent spec, and the skill.
2. Run `git fetch origin`. Continue the ticket's existing branch or PR if there is one, and read its review comments and failed checks. Otherwise create `ticket/<n>-<slug>` from `origin/main`. Done when your branch is based on `origin/main`, whatever commit your worktree started on.
3. Run `pnpm install --frozen-lockfile`.
4. After your first commit, push and open a draft PR with `Closes #<n>`. If this is the last open ticket of its parent spec, close the spec too. Then commit and push often, so an interrupted run loses little.
5. Call the Skill tool with `tdd` to build the ticket, until every acceptance criterion is met. The spec's Testing Decisions are the pre-agreed seams, so you start from those without asking anyone. Work with no behaviour to test, such as docs, goes straight to its acceptance criteria.
6. Call the Skill tool with `code-review`, with `origin/main` as the fixed point. Fix every finding in a single fresh subagent.
7. Merge `origin/main` into your branch, then meet the definition of done in `AGENTS.md`, and keep `PLAN.md` status current.
8. Mark the PR ready for review. The orchestrator merges it.

## Rules

- Base your branch on `origin/main`. If the ticket depends on an unmerged PR, stop as blocked.
- Start subagents wherever they help, as the skill does, such as for exploration or to build parts of the ticket at once. Slots count implementers only, so subagents use none. One that writes code gets its own worktree, and you merge its work into your branch.
- Communicate with subagents sparsely: pass context pointers to the spec, ticket and commits rather than copying them.
- Wait for each subagent's report before you go on, and merge its work yourself. Your final report comes only after step 8, or from the blocked steps below. A subagent's work must never be left for the orchestrator to collect.
- Use fake values from `.env.example` wherever configuration is needed. Real `.env` values stay unread.
- Name any Compose project `ticket-<n>`.

## When blocked

If you need a human decision, or cannot proceed:

1. Push your work.
2. Comment on the ticket with exactly what you need.
3. Add `ready-for-human` for work only a person can do, or `needs-info` for a decision.
4. End.

## Final report

Name the ticket, the PR, what `code-review` found and how each finding was resolved, what you verified, and what you did not verify.
