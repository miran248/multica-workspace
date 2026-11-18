# 0014 — The merge exit is read at the pass

- Status: Accepted, 2026-11-18 (supersedes the gate-lane decision of ADR-0011)
- Supersedes: the lane-per-mode graph in ADR-0011; ADR-0011's label renames and its release
  lane stand. It also narrows ADR-0012's seven reviewer-handled review columns to the four
  without a gate twin — `spec_review`, `in_review`, `human_review`, `release_review` — because
  three of the seven were gate columns this decision deletes; ADR-0012's hourly sweep, its
  threshold and its `task.failed` clause stand.

## Context

ADR-0011 moved the one label read off the merge button: the mode selected a lane when the
Planner promoted a ticket, and the column's declared exit then decided who merged. That grew
the graph to twenty-one columns, six of them gate twins whose only difference from their
non-gate sibling was the exit, and an eight-row promotion table.

The price was not paid back. A column is a state; a twin that differs only by its exit is a
transition, and the platform already gives each column one `next` and one `back`. Encoding the
exit as a state doubles the lane and makes every promotion, bounce and sweep choose the correct
twin. The cached decision is also escapable: a gate ticket the human moves to `in_progress`
re-enters `in_review`, whose PASS merges into `main`, and nothing in the graph records that the
gate was ever applied. The more places a ticket can be moved, the more likely that is.

The live twelve-column graph had always read the label at the PASS. The drill confirmed the
platform mechanics the cache was built on, and also confirmed that the cached lane is not worth
its columns.

## Decision

The mode that changes who merges stays an epic label, but it is read at the PASS, once, in the
one exit rule in `code-review`, the seat that acts on it:

- a PASS on a PR whose base is `spec/<epic>` merges at the reviewed head;
- a PASS on a `main` PR whose epic carries `has-human-release` moves the ticket to
  `awaiting_merge`, where the human merges;
- a PASS on a `main` PR without the label is Reviewer-merged;
- a spec PR always moves to `awaiting_merge` (the spec approval is the human merge, in every
  mode).

Every review column declares `awaiting_merge` as its `next`, so the unattended advance is the
human and the merge is the handled exception. The graph goes from twenty-one columns to fifteen:
the live twelve plus `epic_progress`, `release_progress` and `release_review`. There are no gate
columns.

## Consequences

- The six gate columns are deleted, and the promotion table is four rows: the planner resolves
  only who implements. The release seat and the epic state survive, because they are a seat and a
  state, not exits.
- The exit rule has one copy. No column instruction restates it, and the one label read is a
  native lookup (`gh pr view --json baseRefName`, `multica issue get <parent> --output json`)
  rather than a fresh-context reading of prose.
- Because the rule is evaluated at the action, a ticket bounced to any lane is gated again at its
  next PASS. The invariant cannot be lost by a status move.
- The cost ADR-0011 set out to remove is accepted: a wrong read lands on the merge. It is bounded
  in the safe direction by the declared next (`awaiting_merge`), and the base is a fact on the
  pull request rather than a remembered decision.
- The label is read at each PASS, so a `has-human-release` added after promotion applies at the
  next review. Set the mode before the spec merge when the whole slice is to share it.
- Revisit if the platform ships conditional edges: the exit could then be a native transition
  instead of one prose rule.
