# 0009 — A spec leaves its integration branch as one squash

- Status: Accepted, 2026-11-11
- Supersedes: the release consequence of ADR-0005 for integration specs. A child still
  completes on merge; what that completion means is what moves.

## Context

The platform completes a linked ticket when its PR merges, regardless of base. On an
integration branch every child becomes `done` while `main` has none of it, so the branch
topology silently redefines `done` unless a second, `main`-scoped act exists.

`AGENTS.md` requires one PR, one squash commit and never a merge commit. A spec contains N
reviewed ticket commits; rebase-merging them would rewrite every sha and lose the PR marker,
and a merge commit is banned. Multiple specs in flight also race for `main`: the later release
is stale the moment the first lands.

## Decision

- The spec run publishes a final-stage **release child** in `backlog`, with the release
  procedure and the included children in its body.
- Its PR is `spec/<epic>` → `main`. It merges the current `main` in, resolves, runs the full
  suite and opens the PR at that head. The merge is one squash on `main`, subject
  `type(scope): summary, RELEASE-KEY`, no merge commit.
- A child's `done` is branch-scoped: delivered and reviewed on `spec/<epic>`. The epic's
  `done` is `main`-scoped and only the Planner's acceptance, after verifying the release
  squash is on `main` at the merged sha with the release PR's checks green.
- Releases serialize per repository: at most one release is merge-ready. The Planner queries
  open `spec/*` → `main` PRs before promoting and parks the next release on an until-issue
  condition.
- A red release reworks on the release ticket and `done` children stay `done`. A cancelled
  epic is swept by the Planner: close open PRs, delete the branch, cancel remaining children,
  record what merged and what is abandoned.
- The release follows the epic mode. `manual-merge` gates the release, the spec approval and
  every PR based on `main`; ticket PRs into the branch are Reviewer-merged in every mode.

## Consequences

- `done` has two scopes, and the guide must say so. The release child is the visible
  "not on `main` yet" marker.
- The release is one revertable unit. Reverting it does not un-complete the children; the
  tracker records that they were delivered to a branch.
- A review verdict is only valid at a head that contains the current base. A moved `main`
  sends the release back to `in_progress`, and the Reviewer checks `mergeStateStatus` before
  the release PASS.
- Per-ticket CI is gone by design (ADR-0008). The release PR and the post-merge `main` push
  are the automated gate, and the repository triggers must be filtered to `main` for that to
  be two runs rather than `2N + 2`.
- Parallel specs serialize, so the second release waits instead of refreshing. That is a
  throughput cost accepted for a predictable, atomic release.
