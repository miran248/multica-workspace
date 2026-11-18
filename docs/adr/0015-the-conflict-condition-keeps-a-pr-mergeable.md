# 0015 — A conflicting PR is kept mergeable by one condition

- Status: Accepted, 2026-11-18 (approved in the MIR-227 grilling, round 3)
- Supersedes: nothing. It adds to D20; the stale sweep of ADR-0012 keeps its own carrier.

## Context

The Reviewer's PASS is head-scoped, and `main` moves under a PASSed PR. A conflict that appears
at `awaiting_merge` makes the PR unmergeable and nothing notices: the ticket waits for a human
merge that cannot happen, and the human finds out at the click. Nothing in the catalog watched a
PR's mergeability, so the one fact that can stop a delivery had no carrier.

The platform carries the fact natively. A condition on the ticket can check a linked PR's head
for conflicts (`--until-pr conflicts`, GitHub only) and wake an agent when it holds. The
alternatives were a scanning autopilot over every open linked PR — a second sweep-shaped object
that re-derives the link hourly and duplicates the sweep's premise — and leaving it manual.

The other half is who resolves and what a fix does to the PASS. An agent resolving judgement is
an agent rewriting another author's intent; merging a fix under the old PASS puts an unreviewed
head into `main` under a verdict that never saw it.

## Decision

Every ticket whose PR is linked carries one continuous `--until-pr conflicts` condition,
registered with `multica issue wakeup create --mode continuous` (the command replaces the
configuration, so re-arming does not duplicate it). The Reviewer arms it at every review — the
only seat that runs in every lane between PR open and merge — and the condition survives the
PASS into `awaiting_merge`. It targets the seat that owns the work column: the Planner for a spec
PR, the Implementer for a delivery PR, including a human-authored one. A member is not a wakeup
target, so the Implementer takes the mechanical part and judgement reaches the human by the
status move.

On firing, that seat merges the base, resolves inside `## Touch`, reruns the check that covers
the diff and pushes. The split is judgement, not lane: a base merge, a lockfile or disjoint
hunks is mechanical; when both sides changed the meaning of the same lines, no agent resolves —
it comments and moves the ticket to `human_progress`, on every lane, and the human resolves and
moves it to the review column. Behind-but-clean is not a conflict and never fires the condition;
the merge still works, and a branch protection that requires an up-to-date head is one
`gh pr update-branch`, left manual.

A push voids the PASS. The resolver moves the ticket to the review column that PASSed it — every
review column's `next` is `awaiting_merge`, so the timeline names it — and the Reviewer
re-reviews the delta `H...H'` plus the delivery facts at `H'`. A fresh PASS returns it to
`awaiting_merge`; a blocking finding sends it back to the work column.

The resolution contract is one paragraph in shared `## Delivery`; the arming, the void PASS and
the delta re-review are one copy in `code-review`. No column instruction restates either, and no
new noun is introduced: `guard` stays the retirement refusal.

## Consequences

- No column and no autopilot: one condition per ticket, registered where the seat already runs,
  and it dies with the ticket. The board does not grow.
- Mechanical conflicts are agent work; judgement is a status move to `human_progress`, not a
  mention — the human lane is already the destination for a decision only the human can make.
- The reviewed head is always the merged head. The cost is one bounce through review per fix,
  bounded to the delta rather than a full re-review.
- Behind-but-clean stays out: a moved `main` without a textual conflict does not fire the
  condition, and the suite may not claim otherwise.
- The offline suite pins the two prose copies by presence and absence, never the platform
  mechanic. One live probe at the stage-5 ticket — a linked PR in a disposable repository, a
  conflicting base push, a resolution, a void PASS and a clean re-review — proves the mechanic
  once; it is not a release gate, and the first real conflict after release is the live
  acceptance.
- Revisit if the platform can wake a member: a human-authored PR could then take its own
  mechanical conflicts on the human lane, and the Implementer condition would cover agent
  deliveries only.
