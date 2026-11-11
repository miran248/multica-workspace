# 0008 — A spec's approval merge targets its integration branch

- Status: Accepted, 2026-11-11
- Supersedes: the approval target of ADR-0005. The approval act — the merge of the spec pull
  request — is unchanged.

## Context

ADR-0005 made the merge of the spec PR the only approval act and left the base unstated
because `main` was the only target. Moving delivery onto `spec/<epic>` forces the spec PR to
follow: otherwise approving a spec puts its document on `main` while its implementation sits
on a branch, and the same merge delivers a spec whose behaviour has not merged.

The platform's PR rule completes a linked ticket when a PR merges and does not care about the
base. Retargeting the spec PR therefore keeps the approval mechanics — the merge completes the
spec child, wakes the Planner, and the published set is promoted — and changes only what the
approval delivers. Two costs are accepted rather than fixed: the spec document reaches `main`
only through the release, and the spec PR runs no CI once the repository filters triggers to
`main` (ADR-0009), so the spec run's local `just validate` is its evidence.

## Decision

- An integration spec opens its spec PR against `spec/<epic-key>`. The branch is pushed at the
  fork sha of `main` before the PR exists, because a branch needs a commit.
- The Reviewer's PASS leaves the PR open and moves the spec child to `awaiting_merge`; the
  human merges it there. The merge still completes the spec child and approves the spec, the
  proposed breakdown and the published set.
- The release child owns `spec/<epic>` → `main`. A spec PR never targets `main` when the spec
  has an integration branch.
- A `direct-to-main` spec keeps ADR-0005's target: its spec PR targets `main`.
- No new status and no approval comment: retargeting does not reopen ADR-0005's trigger
  decision or ADR-0006's comment-last rule.

## Consequences

- The spec PR's merge no longer puts the spec on `main`; the release does. The epic's
  acceptance is therefore `main`-scoped (ADR-0009), and the spec child's merge is not the end
  of the spec.
- A spec approval costs no CI run: no trigger fires on a PR whose base is an integration
  branch. The release PR is the first automated check of the integrated tree.
- A spec rework force-pushes the same head branch. The PR never closes and reopens, because a
  closed linked PR cannot be unlinked from the CLI.
- ADR-0005 stays as written; reading it alone now gives the approval act without its target,
  which is what this record supplies.
- A spec that needs the old graph is explicit: `direct-to-main`, no branch, no release child.
