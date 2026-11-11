# 0007 — Publish the slice in the spec run

- Status: Accepted, 2026-11-11
- Supersedes: the slicing point of ADR-0005 ("the merge … wakes the Planner to slice"); the
  approval artifact itself is unchanged.

## Context

Round 2 produced a duplicate Planner run after the spec merge. The stage-1 barrier fired when
the spec child closed, the slicing run created the delivery children, and the platform
re-evaluated the same condition against the new child set, firing a second run. Round 3 avoided
it by creating all five children at intake, before the spec PR existed: with the child set final
before stage 1 closed, the barrier fired once. But round 3's intake could do that only because
the drill epic already carried a fixed breakdown.

A normal epic has no breakdown until the spec is written, so the intake cannot publish it. The
only point before stage 1 closes where the breakdown exists is the spec child's own run. There,
the Planner writes the spec, can publish the set, and only then moves the child to
`spec_review`. Publishing after the merge is the child-set change that re-fires the barrier;
publishing in the spec run removes it.

## Decision

- The spec child's run writes the spec, then publishes the whole slice with `to-tickets`:
  every delivery child under the epic, in `backlog`, blockers first, with its stage, its
  assignee and its blocking identifiers in the body. It checks `issue children` and opens the
  spec PR only after the set is complete.
- The set is a **proposal**, not approved work. Every child is `backlog`; nothing starts; no
  `ready-for-agent` label until the promotion wake. The merge of the spec PR still approves the
  spec and the breakdown.
- The merge completes the spec child and wakes the Planner to **promote**, not to slice. No
  child is created after the merge; a change to the set after publication is a spec revision.
- A spec rework (review FAIL) reconciles the existing children to the revised breakdown: list
  them first, create only what is missing, edit or cancel the rest, never duplicate. A rerun
  after a partial publish does the same.
- If the epic is abandoned, its published children are cancelled with it.
- The stage rules are unchanged: serial tickets get distinct stages, a stage is a parallel
  barrier group, and the closing stage wakes the parent.

## Consequences

- One barrier wake per epic, deterministically: the child set is final before stage 1 closes,
  so the condition cannot become true again when the slice is published.
- The proposed tickets are visible before the human approves the spec. They are inert, but a
  human who rejects the spec now has a published set to reconcile or cancel; that cleanup is
  the price of the single wake. The spec run owns it on FAIL; cancellation owns it on abandon.
- The spec run is longer and can fail midway through publishing. The idempotent reconcile
  (list first, create only missing) makes the retry safe; the spec PR is not opened until the
  set is complete.
- The Reviewer sees the children when reviewing the spec, so a wrong child set is a review
  finding before the merge rather than a surprise after it.
- `roles/planner.md`, `to-tickets`, the `spec_progress` instruction and the guide move
  together, and the offline matrix fails if publication returns to the post-merge wake or a
  child is created `todo`.
- If the platform later stops re-evaluating a satisfied barrier when children change, this
  decision can be relaxed; it is a workaround for an observed platform behaviour, not a
  preference about when a ticket should be visible.
