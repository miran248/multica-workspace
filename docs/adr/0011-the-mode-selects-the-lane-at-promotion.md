# 0011 — The mode selects the lane at promotion

- Status: Accepted, 2026-11-17 (approved in the MIR-227 grilling)
- Supersedes: the `manual-merge`-on-PASS clause of ADR-0004, which kept the mode branch in the
  Reviewer's instructions.

## Context

The Factory graph had three review columns and two axes: who implements, and who merges. Who
merges was read by the Reviewer at the merge, from the ticket's or its parent's labels. That
placed the one label read a fresh-context run could get wrong exactly on the irreversible
action, and it made every review instruction conditional prose.

The platform gives a column one handler, one next and one back. It cannot branch on a label, so
a mode that changes who merges needs either an instruction that reads the label or a column
that already means it.

## Decision

The mode selects the lane when the Planner promotes a ticket, and a column then decides the
behaviour with no label read. The graph grows three columns — `in_progress_gate`,
`in_review_gate`, `human_review_gate` — and the Planner maps the epic's labels and the ticket's
base to a lane in one table: neither label is Reviewer-merged; `human-assigned` starts in
`human_progress`; `manual-merge` selects the gate lane for a pull request whose base is `main`;
`production` selects the gate lane for the release child.

A gate review column's PASS lands at `awaiting_merge`; a normal review column's PASS merges the
pull request into its base and declares no advance. `spec_review` keeps its one exit: PASS
leaves the pull request open and always waits for the human merge, in every mode.

`manual-merge` keeps its boundary scope: it gates the spec approval and every pull request
whose base is `main`. A ticket PR into `spec/<epic>` is Reviewer-merged in every mode, because
the human already approved the set and the branch is scratch.

## Consequences

- Fifteen columns, six custom statuses beside the built-in ones. The gate statuses carry their
  own presentation and are read back like every other declared status.
- No review instruction names `manual-merge`, `human-assigned` or `production`. The mode is
  read once, by the seat that owns it, before work starts; a wrong lane is visible on the board
  instead of silent in a merge.
- The alternative — every ticket PR waits for the human — was rejected: it would add N human
  merges for no new decision on an integration spec.
- Revisit if the platform ships conditional edges: the label could then select a transition
  instead of a lane.
