# Spec F: the autonomous Factory delivery drill

Approval is the merge of this document's pull request in MIR-140: that merge accepts this
spec and the proposed breakdown below. This is drill evidence, not a product change. It lives
under `docs/stress/` rather than `docs/specs/` because the throwaway project confines every
change to that directory; the epic that commissioned the drill stays at `todo` and is accepted
only after every child closes.

## Problem Statement

The Factory graph on `factory-stress-2` now approves a spec by merging its pull request: the
spec is the epic's stage-1 child, its PR links only that child, the Reviewer leaves the PR open
on PASS and moves the child to `awaiting_merge`, and the human merge completes the child and
wakes the Planner to slice. The offline matrix pins that shape, but it cannot prove the
platform's handoff. Nothing in the suite shows that a merge actually completes the child, that
the completion wakes the Planner to publish the breakdown, that a stage barrier withholds the
serial ticket until the parallel stage closes, or that a delivery PASS arms auto-merge and
finishes the ticket.

The previous round stopped at spec acceptance because the spec PR was linked to the epic
instead of to the stage-1 child: the merge closed the wrong artifact, and no delivery ticket
was ever sliced. A route that only works in the matrix is not evidence. This drill runs the
whole route once, on a throwaway project and a throwaway branch, where the only thing under
test is the workflow itself.

## Solution

One spec document — this file — and one fixed four-ticket breakdown. The human merges this
PR; the merge completes the stage-1 spec child MIR-140 and approves both the spec and the
breakdown, and that completion wakes the Planner to slice. The Planner publishes the delivery
children from the merged `Proposed breakdown`: `f1`, `f2` and `f3` in one parallel stage,
`f4` alone in a later stage, created in `backlog` and blocked by all three.

Each delivery ticket is one PR whose diff is exactly one file, `docs/stress/fN.md`, containing
exactly one line: the identifier of the ticket that created it. The Implementer builds it and
moves the ticket to `in_review`; the Reviewer reviews the exact head and, on PASS, arms
auto-merge for delivery PRs and lets the merge complete the ticket. The epic is accepted only
when all four children are closed.

There is no approval comment and no approval column. The single human act is the merge of this
spec PR; every other handoff is a status move or a merge. The drill's evidence is the issue
timeline — statuses, assignees, PR links and merge events — never a file in this repository.

## User Stories

1. As the approval owner, I want the spec and its breakdown approved by one action — merging the spec PR — so I never have to reconcile a separate comment with a diff.
2. As the approval owner, I want the spec PR linked only to the stage-1 spec child, so merging it does not close the epic or attach work to the wrong ticket.
3. As the approval owner, I want every pull request in the drill to target `factory-stress-2`, so nothing reaches `main`.
4. As the approval owner, I want the auto-merge prerequisite recorded in the spec, so a refused arm is a known repository setting rather than a failed drill.
5. As the Planner, I want the merged spec child to wake me to slice, so the delivery children exist because the approval happened, not because someone nudged me.
6. As the Planner, I want `f1`, `f2` and `f3` in one parallel stage with no blocking edges between them, so the parallel barrier is a property of the graph rather than a habit.
7. As the Planner, I want `f4` in `backlog`, blocked by all three stage-1 tickets, so it cannot be promoted before the barrier closes.
8. As the Planner, I want one ticket per PR and per file, so each delivery is independently reviewable and no diff carries two tickets.
9. As the Implementer, I want a delivery ticket to name exactly one path and one line, so the build needs no judgement and the check is string equality.
10. As the Implementer, I want the delivery PR title to carry its own ticket key, so the platform links the PR to the ticket that made it and to nothing else.
11. As the Reviewer, I want to review the spec and its proposed breakdown at the exact head, so a PASS covers the artifact the human is about to approve.
12. As the Reviewer, I want a spec PASS to leave the PR open at `awaiting_merge` and never arm it, so the human's merge is the approval and not a review side effect.
13. As the Reviewer, I want a delivery PASS to arm auto-merge, so the autonomous route closes its tickets without a human merge.
14. As a drill operator, I want the route's evidence on the tracker, not in Git, so the catalog stays stateless.
15. As a maintainer, I want the drill confined to `docs/stress/`, so no catalog, workflow, role, skill or test byte changes.
16. As a future drill operator, I want the previous round's linking failure written down, so the next spec PR cannot repeat it.

## Implementation Decisions

**D1 — Base.** Every pull request in the drill, including this spec PR, targets
`factory-stress-2`, never `main`. This PR adds exactly `docs/stress/spec-f.md`; each delivery
PR adds exactly its own `docs/stress/fN.md`.

**D2 — One file, one line, one identifier.** Each delivery ticket adds exactly one file,
`docs/stress/f1.md` … `f4.md`, whose content is exactly one line: the identifier of the ticket
that created it (for example `MIR-141`), with a trailing newline. No heading, title, date or
trailing text, so the check is string equality, not judgement.

**D3 — One ticket, one PR, one changed path.** Each delivery PR title carries its own ticket
key, its diff is exactly its own `docs/stress/fN.md`, and no other path changes.

**D4 — Shape: three parallel, one serial.** `f1`, `f2` and `f3` are stage 1 with no blocking
edges between them; `f4` is stage 2, parked in `backlog` and blocked by all three, promoted
only after all three are `done`. The epic is accepted only when all four children are closed.

**D5 — The approval is this PR's merge.** The Reviewer reviews at `spec_review` and on PASS
leaves this PR open and moves this ticket to `awaiting_merge`; it never arms a spec PR. The
human merges; the merge completes this ticket to `done` and wakes the epic's Planner to slice.
There is no approval comment. The PR links only the stage-1 spec child — never the epic, and
never after `Closes`, `Fixes` or `Resolves`.

**D6 — Autonomous mode.** The epic carries no labels: the Implementer builds each delivery
ticket, the Reviewer reviews and arms auto-merge for delivery PRs, and the human merges only
the spec PR. `in_progress` and `in_review` are the delivery columns; no human delivery column
is used.

**D7 — No new checks; one owner prerequisite.** `just validate` and `just test` stay the
repository's only checks and are expected green on a docs-only diff. Auto-merge is the
delivery route's one repository capability: checked on 2026-11-10 at the repository,
`allow_auto_merge` reads `false` and `factory-stress-2` has no branch protection or rulesets.
That is an approval-owner prerequisite: **Allow auto-merge** must be on before a delivery PASS
needs to arm. Until it is on, a delivery PASS is recorded and its PR stays open; a refused arm
is never repaired by a hand merge, because that would falsify the drill.

**D8 — The evidence lives on the tracker.** The spec is the only Git artifact. Status,
assignee, pull-request links and merge events on the drill issues are the evidence; the
repository records no run, no workspace identity and no workspace note. A missing evidence
item is a gap, not a pass, and is reported as a finding instead of being written into Git.

**D9 — The linking failure is part of the contract.** The previous round stopped at spec
acceptance because the spec PR was linked to the epic. This PR carries its child's key in the
title and links only that child: the epic's key appears in neither the PR title, branch nor
body, and no closing keyword is used for it. A spec PR linked to the epic is a review finding,
not a mergeable approval.

## Testing Decisions

- **The repository checks do not change.** `just validate` resolves the catalog and
  `just test` runs the offline matrix; a docs-only diff is expected green on both. No workflow
  test, no new seam and no new check is added for the drill.
- **Acceptance is observed, not judged.** The operator runs and records these checks at the
  exact head; they are drill evidence, not new repository tests:
  - `git diff --name-only <base>...<head>` against `factory-stress-2` names exactly the one
    path the ticket owes — `docs/stress/spec-f.md` here, `docs/stress/fN.md` for a delivery.
  - Each delivery file compares equal to `printf '%s\n' <ticket-key>` with `cmp -`; one line
    and a trailing newline, no extra byte.
  - `multica issue pull-requests <ticket>` lists the PR for that ticket; the same command on
    the epic is empty, and the spec PR is not linked to the epic.
- **The platform handoffs are tested by using them.** The merge completes the spec child; the
  completion wakes the Planner to slice; the stage-1 barrier closes only when all three
  parallel tickets are `done`; `f4` stays in `backlog` until then; a delivery PASS arms
  auto-merge and the merge completes the ticket; the epic closes only after the last child.
  Each is read back from the issue timeline, and a step that does not happen is recorded as
  the drill's result.
- **Review happens at the exact head.** A re-push after a verdict reopens the review; the
  verdict applies to the reviewed head, never to "the branch".
- **Anonymity still covers the new file.** The anonymity test walks every Markdown file; this
  spec carries no workspace identity, UUID, personal address or consumer URL.

## Out of Scope

- Any change outside `docs/stress/`: no catalog, workflow, role, skill, template, label,
  migration, script, test or ADR byte changes.
- `main` as a target; the drill is throwaway and `factory-stress-2` is its only base.
- New checks, CI workflows or a new repository seam.
- Product behavior: the delivered files carry an identifier, not a feature.
- Human delivery modes: no `manual-merge`, no `human-assigned`, no `human_progress` or
  `human_review` work. That route belongs to a separate drill.
- Working around a refused auto-merge with a hand merge; the prerequisite is recorded and the
  PASS stands on its own.
- Cleanup: closing the drill project and deleting branches is operator work, outside this
  spec's approval.

## Proposed breakdown

The approval covers these four delivery tickets and their blocking edges as written. The
Planner creates them after this spec child closes; this ticket creates none.

| Stage | Ticket | Outcome | Touch | Blocked by |
| --- | --- | --- | --- | --- |
| 1 | Deliver `docs/stress/f1.md` | the file exists with one line: that ticket's identifier | `docs/stress/f1.md` | none |
| 1 | Deliver `docs/stress/f2.md` | the file exists with one line: that ticket's identifier | `docs/stress/f2.md` | none |
| 1 | Deliver `docs/stress/f3.md` | the file exists with one line: that ticket's identifier | `docs/stress/f3.md` | none |
| 2 | Deliver `docs/stress/f4.md` | the file exists with one line: that ticket's identifier | `docs/stress/f4.md` | `f1`, `f2`, `f3` |

One delivery ticket, one PR, one file. Stage 1 is created at `in_progress` after the merge
approves this breakdown; stage 2 is created in `backlog` and promoted only when all three
stage-1 tickets are `done`. The Planner creates the delivery children after this ticket
closes; this ticket creates none.

## Acceptance criteria

- [ ] The PR adds exactly one file, `docs/stress/spec-f.md`, based on `factory-stress-2`;
  `git diff --name-only` against the base names that path alone.
- [ ] The PR is linked to this ticket only: `multica issue pull-requests` on this ticket lists
  it, and the epic has no pull request.
- [ ] This spec carries observable acceptance criteria and the fixed proposed breakdown:
  `f1`–`f3` stage 1 parallel; `f4` stage 2 blocked by all three; base `factory-stress-2`; one
  ticket, one PR, one file.
- [ ] `just validate` and `just test` pass on the diff, or the failure is reported instead of
  claimed.
- [ ] The spec child reaches `spec_review` with the reviewer guard registered, and the epic is
  still `todo`.
- [ ] No approval comment is posted: the merge is the approval.

## Further Notes

**Repository prerequisite.** On 2026-11-10, `allow_auto_merge` read `false` at the repository
and `factory-stress-2` had no branch protection or rulesets. The approval owner turns
**Allow auto-merge** on before the first delivery PASS needs to arm. The setting is not a Git
change and no PR can carry it.

**Operational note.** The workspace repository cache can predate `factory-stress-2`; a
checkout may report "cannot resolve requested ref". The fallback is a clone branched from
`origin/factory-stress-2` and a PR opened with `--base factory-stress-2` — never `main`.

**Expected shape at acceptance.** The spec child closes on the merge; the Planner slices
because that completion woke it; exactly four delivery children exist; the epic stays `todo`
through the whole delivery; `f4` waits in `backlog` for the parallel stage; the epic reaches
`done` only after the last child closes, by planner acceptance.

**What this drill proves.** The route from a spec PR to a merged-and-closed epic, with the
merge as the only approval and auto-merge as the delivery handoff. The catalog's offline
matrix remains the contract; this drill is the live evidence that the platform performs it.
