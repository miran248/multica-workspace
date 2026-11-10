# Spec I: auto-merge and children created at intake

Draft for the Factory live acceptance drill, round 3. The approval is the merge of this
spec child's pull request: it approves the spec and the proposed breakdown, completes the
child, and wakes the epic's Planner to promote the stages that are already parked.

## Problem Statement

Round 2 of the Factory live acceptance drill passed every route but proved nothing about
auto-merge: the repository had `allow_auto_merge: false`, so no delivery pull request was
ever armed, and no PASS ever exercised the autonomous merge. Round 2 also produced a
duplicate Planner run seconds after slicing, because the delivery children were created
*after* the spec child closed, so the barrier condition re-evaluated against a child set
that had just grown.

Both defects are properties of the run, not of the catalog. The route the catalog declares
is unchanged and correct: a delivery Reviewer's PASS arms auto-merge and the merge completes
the ticket. What is missing is a drill that observes that route, and one that creates the
whole child set before the spec pull request exists so the set is final when stage 1
closes.

## Solution

Run the drill once more against the `factory-stress-3` branch, with exactly two changes to
the run: the repository has Allow auto-merge enabled, and the intake run creates all five
children — the spec child and four delivery tickets — before the spec pull request exists.

The spec travels as the stage-1 child's pull request and is the only new file. Four one-line
delivery files are the deliverables, each in its own ticket and pull request. Every pull
request in the drill targets `factory-stress-3`, never `main`. The merge of the spec pull
request is the approval of the spec and of the proposed breakdown; it completes the spec
child and wakes the Planner to promote the parked stages, not to slice a second time. The
epic is accepted only after every child closes.

## User Stories

1. As the approval owner, I want the spec and the breakdown approved by one merge, so the drill has one action and one place to read.
2. As the Planner, I want the whole child set to exist at intake, so the spec merge produces exactly one wake instead of a second slicing run.
3. As the Reviewer, I want every delivery pull request to change one one-line file, so a verdict is string equality rather than judgement.
4. As the Implementer, I want one ticket, one pull request and one changed path per delivery, so a delivery cannot carry unrelated work.
5. As the approval owner, I want a delivery PASS to arm auto-merge, so the autonomous route is proven end to end rather than inferred.
6. As the approval owner, I want a refused arm recorded rather than repaired by hand, so the acceptance run reports what actually happened.
7. As a future acceptance run, I want the stage graph exercised as three parallel tickets and one serial ticket, so the barrier is proven alongside the merge.
8. As a maintainer, I want the drill confined to `docs/stress/`, so the catalog and the shipped Factory contract are untouched.

## Implementation Decisions

**D1 — Base.** Every pull request in the drill, including this spec pull request, targets
`factory-stress-3`, never `main`. This pull request adds exactly `docs/stress/spec-i.md`.

**D2 — One file, one line, one identifier.** Each delivery ticket adds exactly one file —
`docs/stress/f1.md` … `f4.md` — whose content is exactly one line: the identifier of the
ticket that created it (`MIR-149` … `MIR-152` respectively), with a trailing newline. No
heading, title, date or trailing text, so the check is string equality, not judgement.

**D3 — One ticket, one pull request, one changed path.** Each delivery pull request title
carries its own ticket key, its diff is exactly its own `docs/stress/fN.md`, and no other
path changes.

**D4 — Shape: three parallel, one serial.** The spec child is stage 1. `f1`, `f2` and `f3`
(`MIR-149`, `MIR-150`, `MIR-151`) are stage 2 with no blocking edges between them; `f4`
(`MIR-152`) is stage 3, parked in `backlog` and blocked by all three, promoted only after
all three are `done`. The epic is accepted only when all five children are closed.

**D5 — The approval is this pull request's merge.** The Reviewer reviews at `spec_review`
and on PASS leaves this pull request open and moves this ticket to `awaiting_merge`; it
never arms a spec pull request. The human merges; the merge completes this ticket to `done`
and wakes the epic's Planner to promote, not slice. There is no approval comment.

**D6 — Autonomous mode.** The epic carries no labels: the Implementer builds each delivery
ticket, the Reviewer reviews and arms auto-merge for delivery pull requests, and the human
merges only the spec pull request. Record per delivery pull request whether an
`auto_merge_enabled` event appears or it merged directly.

**D7 — Auto-merge is enabled.** Checked 2026-11-10 at the repository: `allow_auto_merge`
reads `true`. A delivery PASS arms auto-merge; a refused arm is recorded, never repaired by
a hand merge that would falsify the drill.

**D8 — The child set is final at intake.** All five children were created by the epic's
intake run before this pull request existed; this ticket creates none, and no later run
adds a child.

## Testing Decisions

Tests assert observable facts about the run, not the bytes of a given file: the checks below
are commands and events, so a verdict cannot drift from judgement.

- **The stage-1 diff is the check.** `git diff --name-only` against the base names
  `docs/stress/spec-i.md` alone, and `just validate` and `just test` are green on the exact
  head that is reviewed.
- **Delivery is string equality.** For `f1`, `printf 'MIR-149\n' | cmp - docs/stress/f1.md`
  exits 0; the same shape holds for `f2`–`f4` with `MIR-150`–`MIR-152`. The diff against
  `origin/factory-stress-3` names exactly the one path.
- **The link is observable.** The spec pull request lists on this child only; the epic's
  pull-request list stays empty.
- **The route is observed, not simulated.** After the merge the child closes and one Planner
  wake promotes `f1`–`f3` to `in_progress`; `f4` stays in `backlog` until stage 2 closes,
  then is promoted. A second wake, or a child created after intake, fails the drill.
- **Auto-merge is recorded per delivery pull request.** Each PASS either shows an
  `auto_merge_enabled` event followed by the merge, or the pull request merged directly; the
  observed result is written down per pull request, and a refused arm is not repaired.
- **The suite's anonymity guard still holds.** `tests/anonymity.test.js` refuses a live UUID,
  a personal email, a consumer workspace name or an absolute home path in any text file; the
  new document carries none.
- **The catalog harness is unchanged.** `just validate` resolves the catalog and `just test`
  runs the offline matrix; no test is added, changed or skipped for the drill.

## Acceptance criteria

- [ ] The pull request adds exactly one file, `docs/stress/spec-i.md`, based on
      `factory-stress-3`; `git diff --name-only` against the base names that path alone.
- [ ] The pull request is linked to this spec child only; the epic's pull-request list is
      empty.
- [ ] `docs/stress/spec-i.md` carries the catalog's spec sections and the fixed proposed
      breakdown: `f1`–`f3` stage 2 parallel; `f4` stage 3 blocked by all three; base
      `factory-stress-3`; one ticket, one pull request, one file.
- [ ] Each delivery file `docs/stress/fN.md` is byte-equal to its identifier plus a newline,
      checked with `cmp`, and its pull request diff names exactly that one path.
- [ ] `just validate` and `just test` pass on the exact head, or the failure is reported
      instead of claimed.
- [ ] This ticket reaches `spec_review` with the reviewer guard registered, moves to
      `awaiting_merge` on PASS, and reaches `done` only by the merge; the epic stays `todo`
      until every child closes.

## Out of Scope

- Product code and any path outside `docs/stress/`: the drill is documentation evidence, not
  a product change.
- Reopening the shipped Factory contract: `docs/factory.md`, the workflow definition, its
  ADRs and the role contracts are the approved direction and are not amended here.
- Slicing after approval: the proposed breakdown is fixed at intake, and the post-merge
  Planner run promotes it without creating a child.
- Any child beyond the five already created at intake.
- `main`: no pull request in the drill targets it, and merging `factory-stress-3` back to
  `main` is not part of this spec.

## Proposed breakdown

| Stage | Ticket | Outcome | Touch | Blocked by |
| --- | --- | --- | --- | --- |
| 1 | MIR-148 — Spec: auto-merge and children created at intake | the spec document exists on `factory-stress-3` | `docs/stress/spec-i.md` | none |
| 2 | MIR-149 — Deliver `docs/stress/f1.md` | the file exists with one line: `MIR-149` | `docs/stress/f1.md` | MIR-148 |
| 2 | MIR-150 — Deliver `docs/stress/f2.md` | the file exists with one line: `MIR-150` | `docs/stress/f2.md` | MIR-148 |
| 2 | MIR-151 — Deliver `docs/stress/f3.md` | the file exists with one line: `MIR-151` | `docs/stress/f3.md` | MIR-148 |
| 3 | MIR-152 — Deliver `docs/stress/f4.md` | the file exists with one line: `MIR-152` | `docs/stress/f4.md` | MIR-149, MIR-150, MIR-151 |

One delivery ticket, one pull request, one file. The stage-2 tickets are already in
`backlog` and are promoted to `in_progress` when this spec child closes; `f4` stays in
`backlog` until MIR-149–MIR-151 are `done`, then is promoted. The epic reaches `done` only by
the Planner's acceptance after every child closes.

## Further Notes

- **Why `docs/stress/`.** The document is drill evidence and not an accepted catalog spec, so
  it lives beside the round's deliverables under `docs/stress/`, not in `docs/specs/`. The
  project confines every change to that directory.
- **What round 3 adds to round 2.** The routes were already proven; this round adds the two
  facts round 2 could not observe: a delivery PASS arms auto-merge and merges autonomously,
  and an intake-time child set yields exactly one Planner wake after the spec merge.
- **What the run must record.** For each delivery pull request, whether an
  `auto_merge_enabled` event appeared or it merged directly; whether the stage-2 promotion
  happened on one wake; and whether `f4` sat in `backlog` until stage 2 closed.
- **Failure is recorded, not repaired.** A refused auto-merge arm or a duplicate wake is a
  finding for the acceptance record. Repairing it by hand or by re-running the promotion
  would falsify the drill.
- **The catalog is the contract.** This document describes the run; it does not change the
  Factory workflow, the roles or any catalog byte.
