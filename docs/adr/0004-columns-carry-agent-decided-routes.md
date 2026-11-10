# 0004 — Columns carry the routes agents decide

- Status: Accepted, 2026-11-10 (approved in the design discussion; implemented in PR #23)
- Supersedes: nothing

## Context

The Factory workflow had no approval gate. `spec_review` PASS went to `done`, so the epic
closed at spec acceptance, before its children existed. The 2026-11-10 live drill found it:
the Planner and the Reviewer both wrote that the epic would close early, and the graph closed
it anyway. A comment is not a gate.

The platform's handoff is one record per column: a handler, instructions, one
`next_status_key` and one `back_status_key`. Entering a column assigns the handler and starts
its run. There is no conditional edge, no per-transition prompt and no gate decision the
server records; whatever a column cannot express lives in instructions, which nothing
enforces.

Two shapes were on the table:

- **A — a column per decision owner.** Each review column declares the one back target its
  ticket kind needs, human delivery reviews in its own column, the spec is the epic's stage-1
  child, and the human merge of the spec PR is the approval.
- **B — a column per turn.** `in_review` and `human_progress` serve every lane; the Reviewer
  classifies a ticket from a label and the human uses one column for both writing and merging.
  Three fewer columns, every route in instructions.

## Decision

Adopt A.

- A review column's declared back target is correct for every ticket it accepts:
  `spec_review`→`spec_progress`, `in_review`→`in_progress`, `human_review`→`human_progress`.
  Human delivery gets `human_review` rather than a classification step inside `in_review`.
- The spec is a stage-1 child. `spec_review` PASS leaves the PR open at `awaiting_merge`; the
  human merge completes the child and is the approval. The epic stays at `todo`, the spec PR
  never links it, and the Planner slices after the child closes.
- The merge is the transition. `awaiting_merge` declares no edge, so no status move can close
  a ticket there without a merge; a change request names the lane that owns the work.
- `blocked` keeps dependency waits; rework never routes through it.

Routes that stay in instructions are the ones a label or the human decides: the three
send-back targets at `awaiting_merge`, the `manual-merge` branch on PASS in `in_review` and
`human_review`, and `blocked` triage. A column cannot express them — one next and one back —
and duplicating a lane per mode would move the same condition to the promoting actor. The
route table in `tests/factory-workflow.test.js` pins every instruction-only target instead.

## Consequences

- Twelve columns, five custom statuses (`spec_progress`, `spec_review`, `human_progress`,
  `human_review`, `awaiting_merge`); `human_review` and the spec-as-child rule are the price of
  an honest back target and a real approval gate.
- The platform's needs-changes control is now correct in every review column; a human FAIL
  cannot be handed to the Implementer.
- Approval is a merge, not a status. A human who does not merge stops the epic, which is the
  intended failure mode.
- A FAIL returns to the lane that authored the work; no rework path crosses lanes.
- A new seat costs a column with declared edges, plus a row in the guide and the route table;
  the matrix fails until both exist.
- B would have been three columns smaller. It was rejected because the drill's two agents
  acted against explicit prose, and label classification would add a decision to the least
  enforced layer. Revisit if conditional edges ever ship upstream.
