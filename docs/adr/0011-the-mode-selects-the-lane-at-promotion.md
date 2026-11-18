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

The `release` role existed and no handler selected it: its procedure lived in the release
ticket's body, so the seat had no lane and the procedure had no contract. The epic also had no
state of its own: an approved slice in flight and a queued epic both read `todo`.

## Decision

The mode selects the lane when the Planner promotes a ticket, and a column then decides the
behaviour with no label read. The graph grows five columns — `epic_progress`,
`release_progress`, `release_progress_gate`, `release_review`, `release_review_gate` — to
twenty columns, and the Planner maps the epic's labels, the ticket's kind and the ticket's base
to a lane in one table: neither label is Reviewer-merged; `has-human-implementer` starts a
delivery in `human_progress`; `has-human-release` selects the gate lane for a pull request whose
base is `main`; the release child starts in `release_progress` or `release_progress_gate` and
is reviewed in its own twin. The epic itself moves `todo` → `epic_progress` at the first delivery
promotion and `epic_progress` → `done` on acceptance; `epic_progress` has no handler, so the
move dispatches nothing.

A gate review column's PASS lands at `awaiting_merge`; a normal review column's PASS merges the
pull request into its base and declares no advance. `spec_review` keeps its one exit: PASS
leaves the pull request open and always waits for the human merge, in every mode.

`has-human-release` keeps the boundary scope `manual-merge` had: it gates the spec approval and
every pull request whose base is `main`. A ticket PR into `spec/<epic>` is Reviewer-merged in
every mode, because the human already approved the set and the branch is scratch. The release
child's base is always `main`, so only the merge axis applies to it; `has-human-implementer`
changes who implements delivery, not who releases.

The labels are renamed `human-assigned` → `has-human-implementer` and `manual-merge` →
`has-human-release`. `has-` states a property of the epic's delivery, so the two flags compose;
`uses-` would name a tool or an actor the epic employs and read as a per-run choice. Both
renames run as catalog migration-ledger events, so the live labels keep their ids and their
issues; the catalog, the review instructions, the guide and the tests carry the new names.

## Consequences

- Twenty columns, thirteen custom statuses beside the built-in ones. The gate, release and epic
  statuses carry their own presentation and are read back like every other declared status.
- Six review columns, three of them gates, and no review instruction names
  `has-human-release`, `has-human-implementer`, `manual-merge` or `human-assigned`. The mode is
  read once, by the seat that owns it, before work starts; a wrong lane is visible on the board
  instead of silent in a merge.
- The release seat now has a lane and a contract, so its procedure has one home and the release
  ticket carries only its instance.
- The two label renames are pinned by the migration resolver: a ledger event that leaves both
  names live fails.
- The alternative — every ticket PR waits for the human — was rejected: it would add N human
  merges for no new decision on an integration spec.
- Revisit if the platform ships conditional edges: the label could then select a transition
  instead of a lane.
