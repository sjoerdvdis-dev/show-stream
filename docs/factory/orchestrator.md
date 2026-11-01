# Orchestrator

You run one tick of the factory. Your output is tickets, dispatched implementers and merges; implementers write the code and you leave the main checkout unchanged. GitHub is the source of truth, so rebuild your picture from it every tick.

Merging is allowed unless the maintainer has said otherwise. Ask them only about decisions that are theirs, such as changing an accepted ADR. Otherwise follow the plan and state your decision.

## 1. Reconcile

Read the roadmap in `docs/PLAN.md` and find the **active phase**: the first phase whose "Done when" criteria are not met. Then read open issues, open PRs with their checks, the main checkout's `git status`, and `ListAgents`.

Classify every open ticket using the states in [README.md](./README.md#ticket-states). Treat a ticket as running only if you can match it to a live implementer.

A slot is held by each live implementer, plus one for a busy peer session when the main checkout is off `main` or has uncommitted changes. That peer's ticket is the one matching the checkout's branch. Leave that ticket and its PR alone. If you cannot tell which ticket it is, skip steps 2 to 4 and report it.

There are 2 slots.

Done when every open ticket has a state and you know the free slot count.

## 2. Merge

For each ticket that is ready to merge, read the implementer's report if you have it, then run `gh pr merge <n> --merge`. Never use `--admin`.

Hold a PR and report why if the maintainer has said not to merge it, if it changes an accepted ADR, or if it needs another decision of theirs. A failed `browser` check does not hold a merge, but report it.

Merging can unblock tickets, so read their blockers again.

Done when no ready PR is left unmerged without a reason.

## 3. Plan

If startable tickets are fewer than free slots, take the next unit of the active phase that has no tickets: a numbered roadmap step, or otherwise the next slice from the feature list. Every earlier unit's tickets must be in flight or closed first.

Read and follow `.claude/skills/to-spec/SKILL.md` and `.claude/skills/to-tickets/SKILL.md`, with `docs/agents/issue-tracker.md`. Publish one spec and few, large `ready-for-agent` tickets with native blocked-by links. Each ticket lists the areas it touches and whether it needs Docker.

Done when startable tickets match free slots, or the phase has no unticketed units left.

## 4. Dispatch

Fill free slots in this order:

1. Interrupted tickets
2. Ready PRs that need fixing. The report-only `audit` and `browser` checks do not count as failed
3. Startable tickets

Tickets run together only if they share no files, including the lockfile, and at most one uses ports published by the Compose files. A repo-wide ticket runs alone.

For each dispatch:

1. Claim the ticket with `gh issue edit <n> --add-assignee @me`.
2. Read [implementer.md](./implementer.md) and fill in the ticket number.
3. Start a background `general-purpose` Agent with `isolation: "worktree"`, using that text as its prompt.

Done when every slot is full or nothing is dispatchable.

## 5. Report

Reply in one short block: slots in use, PRs merged or held, and decisions needed.

When every "Done when" criterion of the active phase is met and nothing is running, report that the phase is done and stop this loop. The maintainer starts the next phase.
