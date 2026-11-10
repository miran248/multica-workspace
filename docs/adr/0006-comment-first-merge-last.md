# 0006 — Comment first, merge last

- Status: Accepted, 2026-11-10
- Refines: ADR-0004 (the merge is the transition)

## Context

The round-3 drill (MIR-146–MIR-152) showed the catalog ordering its own race. Every handoff
comment was published **after** the status move that dispatched the next run:

- the spec move to `spec_review` at 23:13:03 created the Reviewer's run at 23:13:03; the spec
  handoff comment landed at 23:13:28;
- the Planner's stage promotions dispatched three Implementer runs at 23:17:02 and the
  promotion note followed at 23:17:22;
- all four delivery PASS verdicts were written 15–25s after the merge had already completed the
  ticket.

The cause was explicit. `shared/instructions.md` said "the status move is the handoff";
`templates/handoff.md` said to make the change *before* posting; and the review columns said
"arm auto-merge … and move it to `done`". A move made first is correct only for dispatch — it
is wrong for the note, because the handler starts against a ticket whose record does not exist
yet.

Enabling `allow_auto_merge` did not produce a single `auto_merge_enabled` event: the Reviewer
waits for the required check before arming, so `gh pr merge --auto` merged directly. Auto-merge
is also status-blind: an armed PR at `awaiting_merge`, or a carried spec PR, merges as soon as
its checks pass, and the platform completes the linked ticket on merge from any non-terminal
status. Arming is therefore a second merge authority that bypasses the human gate.

## Decision

- The comment is the handoff. The status move (or the merge) is the last action: publish the
  handoff or verdict, then move. A work column comments and moves; a review column posts the
  verdict and then moves or merges; a Planner promotion note precedes the promotions.
- A delivery PASS is a direct merge after the verdict at the reviewed head — squash, delete the
  branch. No column enables auto-merge. `in_review` and `human_review` declare no next status:
  the merge completes the ticket, so a hand move to `done` would close work nobody merged.
- Leave `allow_auto_merge` off on every Factory repository. GitHub refusing the arm is the
  mechanical guard behind the Reviewer instruction; the setting is not a substitute for the
  human gate.
- Ticket acceptance criteria are statements, not checkboxes. Completion is a merge or a status
  move, no role edits the description afterwards, and the Reviewer's PASS records the evidence
  per criterion.

## Consequences

- The next handler's run now starts with the handoff already on the ticket; the 25s (Planner)
  and 15–25s (Reviewer) windows are gone.
- A comment without its move stalls the ticket. The per-review `task.failed` and the 90m review
  check remain the only guard, and the move is still the only dispatch.
- Ordering cannot be atomic: there is no single call that posts and moves. The offline matrix
  pins the wording in the shared contract, the roles, the handoff template and every workflow
  step, so a later edit that returns to move-first fails CI.
- A Reviewer PASS now merges immediately instead of arming a deferred merge. The required check
  is already green at the verdict, so the merge is the intended act; a deferred merge is gone by
  design, not accident.
- Existing tickets keep whatever checklists they already carry; the template change applies to
  new tickets, and the PASS evidence is the record either way.
