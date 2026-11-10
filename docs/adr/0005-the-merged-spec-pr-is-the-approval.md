# 0005 — The merged spec PR is the approval

- Status: Accepted, 2026-11-10 (approved in the design discussion; implemented in PR #23)
- Supersedes: the approval-comment gate in `docs/specs/catalog-rollout.md` and
  `docs/specs/planner-skill-dedupe.md` for Factory specs

## Context

ADR-0004 made the merge of the spec child the approval. The ticket breakdown stayed where it
was: the Planner presented it as an approval packet and waited for an approval-owner comment
before publishing children. That left two approvals for one gate — `roles/planner.md` said
both "one approval comment approves spec and tickets" and "its merge approves it" — and the
merge only approved the PR's diff, which did not contain the breakdown.

The platform does not infer a decision from a close: a merged PR completes its ticket, a
closed one changes nothing, and no wakeup condition observes a close. A close is also
ambiguous — rejected, superseded, rebased, cancelled — and a rejection routes to different
columns (spec rework, delivery rework, cancellation), so it cannot be assumed.

## Decision

One artifact, one approval act.

- The spec PR carries the spec and its proposed breakdown: the ticket list with blocking
  edges.
- The Reviewer reviews both at the exact head; the human merges the PR. The merge completes
  the spec child, approves the spec and the breakdown, and wakes the Planner to slice.
- There is no separate approval-owner comment for a Factory spec. `to-spec` writes the
  breakdown, `to-tickets` reads the merged list and publishes it, and a change to that list
  is a new spec revision, not a slice decision made after approval.
- A close without merge is a withdrawal: the ticket returns to the work column that owns it,
  or the epic is cancelled. The close is the signal; the status move is the record, because
  the platform does not act on a close.

## Consequences

- The spec PR is the only approval artifact; the human has one action (merge) and one place
  to read (the PR).
- The accepted specs that made the comment the gate are superseded for Factory specs; their
  history stays.
- The Planner cannot publish a slice the merged PR does not carry; a missing or wrong
  breakdown is a review finding before the merge, not a post-approval negotiation.
- A closed spec PR does not wake the Planner. The human must move the child back to
  `spec_progress`, or cancel the epic; a close alone leaves it at `awaiting_merge` and the
  epic stalled.
- The guide, the role and the three skills move together, and the offline matrix fails if the
  approval comment returns or the breakdown leaves the spec PR.
