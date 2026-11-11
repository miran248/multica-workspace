# Round 4 Factory live acceptance: publish the slice in the spec run

Proposed 2026-11-11 in MIR-156. Approved by the merge of this spec's pull request, which
completes MIR-156 and wakes the epic's Planner to promote the published set. MIR-153 is the
epic; it stays `todo` until the Planner accepts it. This is drill evidence, not a product
change: it lives under `docs/stress/` because the project confines every change to that
directory.

## Problem Statement

Round 2 produced a duplicate Planner run after the spec merge. The stage-1 barrier fired when
the spec child closed, the Planner's slicing run created the delivery children, and the
platform re-evaluated the same condition against the new child set, firing a second run.

Round 3 avoided the duplicate by creating all five children at epic intake, before the spec PR
existed. That proved the barrier could fire once, but it was a fixture artifact: the intake
could publish the slice only because the drill epic already carried a fixed breakdown. A real
epic has no ticket list until the spec is written, so the intake cannot publish it, and
publishing after the merge is exactly the child-set change that re-fires the stage-1 barrier.

The workflow therefore needs a path that is real for an epic and still produces one wake:
publish the whole slice at the only point where the breakdown exists and stage 1 has not yet
closed — the spec child's own run.

## Solution

The spec child's run writes the spec, publishes every delivery child under the epic, verifies
the staged layout, and only then opens the spec pull request. The set is final before stage 1
closes. The merge of that PR approves the spec, the proposed breakdown and the published set,
and the resulting Planner wake promotes the frontier instead of slicing. No child is created
after the merge.

Round 4 tests that path end to end. The repository has `allow_auto_merge: false`, so every
merge in the drill is an explicit command; the only human act is the merge of the spec PR.

The four delivery children are one-line documentation files. Each is a narrow vertical slice:
its ticket names the file, the one line it contains, the base branch, the one PR and the
checks. This keeps the drill about the workflow — publication point, barrier wake, promotion
— rather than about product code.

## User Stories

1. As the approval owner, I want a real epic to publish its slice inside the spec run, so that the single-wake behaviour is not an intake-only fixture.
2. As the Planner, I want the whole child set final before the spec child closes, so that publishing cannot re-fire the stage-1 barrier.
3. As the Planner, I want the spec merge to wake me to promote and not to slice, so that a merge cannot create tickets an approval did not cover.
4. As the Implementer, I want the published children inert in `backlog`, so that no delivery work starts before the merge approves the set.
5. As the Reviewer, I want the published children visible while reviewing the spec, so that a wrong child set is a finding before the merge rather than a surprise after it.
6. As the approval owner, I want the merge to approve the spec, the breakdown and the set in one act, so that there is no separate approval comment to reconcile.
7. As the Implementer, I want one file, one line and one identifier per delivery child, so that each success is verifiable by string equality rather than judgement.
8. As the Reviewer, I want every delivery PR to target `factory-stress-4` and carry its own ticket key, so that the platform links one ticket to one PR.
9. As the Planner, I want `f4` to wait for all three stage-2 children, so that the serial edge is a real barrier and not a position label.
10. As the approval owner, I want the epic to reach `done` only by the Planner's acceptance, so that the spec merge is not mistaken for completion.
11. As a maintainer, I want the drill recorded as a spec with its decisions and its unverified claims, so that a later round can read what this one actually proved.

## Implementation Decisions

**D1 — Every pull request targets `factory-stress-4`, never `main`.** The project branch is
the drill's base; `main` takes no direct push and no delivery PR in this slice. This includes
the spec PR and all four delivery PRs.

**D2 — One file, one line, one identifier per delivery.** Each of `docs/stress/f1.md` …
`f4.md` contains exactly one line: the identifier of the ticket that created it, followed by a
trailing newline. The file is the ticket's own key and nothing else; string equality is checked
with `cmp` against the expected bytes, not with a visual read.

**D3 — One ticket, one PR, one changed path.** Each delivery ticket changes exactly one path
and opens exactly one pull request, whose title carries its own ticket key. The change-set
check is `git diff --name-only origin/factory-stress-4...HEAD`, and it must name only that
ticket's file. The spec ticket changes only `docs/stress/spec-j.md`.

**D4 — Shape: one spec child, a parallel stage, then a serial child.** MIR-156 is the epic's
stage-1 spec child. MIR-157 (`f1`), MIR-158 (`f2`) and MIR-159 (`f3`) are stage 2 with no
edges between them — a parallel barrier group. MIR-160 (`f4`) is stage 3, blocked by all
three. A stage is a barrier group, not a position label: the independent children share
stage 2, and the dependent child gets its own later stage.

**D5 — The approval is the spec PR's merge.** The Reviewer reviews at `spec_review`. PASS
leaves the pull request open and moves MIR-156 to `awaiting_merge`. The human merges it: the
merge completes MIR-156 and wakes the epic's Planner to promote the frontier, not to slice.
The merge approves the spec and the published breakdown together; there is no separate
approval comment.

**D6 — Autonomous mode.** The epic carries no `human-assigned` or `manual-merge` label and
this run writes no approval comment. In the delivery lane the Implementer builds and the
Reviewer reviews and squash-merges each delivery PR. The spec PR is the one exception: the
Reviewer never merges it (D5), so its merge is the single human act in the drill.

**D7 — No auto-merge, ever.** The repository has `allow_auto_merge: false` and nothing in
this drill arms auto-merge. Every merge is an explicit `gh pr merge --squash --delete-branch`
(or the human's equivalent) at a reviewed head. An armed PR would merge on its checks and
bypass both the Reviewer's verdict and the human approval gate.

**D8 — Publication happens in this spec run, before the PR.** This run publishes all four
delivery children before the spec PR exists and checks `issue children` before opening it. The
child set is final before stage 1 closes, which is what keeps the barrier wake single. A change
to the set after publication is a spec revision, not a promotion decision; on a rework the run
lists the children first, creates only what is missing and reconciles the rest, never
duplicates.

## Testing Decisions

This is a documentation drill, so the checks are the catalog's existing suite plus observable
platform facts; no new test module is introduced.

- **The catalog suite covers the repository.** `just validate` validates the catalog offline
  and `just test` runs the Node test suite, including the Factory workflow matrix. They assert
  behavior and invariants, not the bytes of this spec.
- **The change set is checked by Git.** `git diff --name-only origin/factory-stress-4...HEAD`
  must name exactly `docs/stress/spec-j.md`; an extra path is a finding, not a widening.
- **The published set is checked before the PR opens.** `multica issue children MIR-153` must
  show exactly five children: MIR-156 at stage 1, MIR-157–MIR-159 at stage 2 and MIR-160 at
  stage 3, with every delivery child in `backlog` and assigned to the Implementer. The check
  runs after publication and before `gh pr create`.
- **Delivery files are checked by string equality.** For each delivery, `cmp` compares the
  file against the ticket's identifier plus a newline. The Reviewer records the result at the
  reviewed head.
- **The post-merge claims are observed, not assumed.** The drill records whether exactly one
  Planner wake follows the spec merge, whether `issue children` is unchanged across that wake,
  whether MIR-160 stays in `backlog` until stage 2 closes and is then promoted without a nudge,
  and whether the epic reaches `done` only by the Planner's acceptance. These are unverified
  until the merge and the delivery merges happen.

## Acceptance criteria

1. Before the spec PR is opened, `issue children MIR-153` shows exactly five children: MIR-156 at stage 1; MIR-157, MIR-158 and MIR-159 at stage 2; MIR-160 at stage 3; every delivery child is `backlog` and assigned to the Implementer.
2. The spec PR is opened only after that check, targets `factory-stress-4`, links MIR-156, and carries MIR-156's key in its title and branch — never MIR-153, and never after `Closes`, `Fixes` or `Resolves`.
3. The spec PR's only change is `docs/stress/spec-j.md`, and `git diff --name-only origin/factory-stress-4...HEAD` names exactly that path.
4. `just validate` and `just test` pass at the exact head reviewed; a failure is reported, not claimed.
5. The Reviewer's PASS at `spec_review` is posted at the exact head, leaves the spec PR open and moves MIR-156 to `awaiting_merge`; the human merge completes MIR-156.
6. Exactly one Planner wake follows the spec merge; `issue children` is unchanged across that wake and no child is created after the merge.
7. MIR-160 stays in `backlog` until MIR-157–MIR-159 are closed, then is promoted to `in_progress` without a nudge; it is not promoted with stage 2.
8. The epic reaches `done` only by the Planner's acceptance after every child closes, never by the spec merge.
9. Every delivery PR targets `factory-stress-4`, carries its own ticket key and changes exactly one path; `allow_auto_merge` stays off and no PR is armed.

## Out of Scope

- Any change to the catalog, `docs/factory.md`, `docs/adr/` or the Factory workflow: ADR-0007
  already records the publication decision, merged as `110cbd9`.
- Publishing any child after the spec PR opens or after the merge, and any promotion performed
  by this ticket.
- Labels, an approval comment, `ready-for-agent` at publication, and any auto-merge.
- The `main` branch, direct pushes and repository settings other than respecting the existing
  `allow_auto_merge: false`.
- Product behaviour: the delivery files are drill evidence only.

## Proposed breakdown

| Stage | Ticket | Outcome | Blocked by |
| --- | --- | --- | --- |
| 1 | MIR-156 | This spec and the published set; approved by this PR's merge | — |
| 2 | MIR-157 | `docs/stress/f1.md` — one line, its own key; one PR | MIR-156 |
| 2 | MIR-158 | `docs/stress/f2.md` — one line, its own key; one PR | MIR-156 |
| 2 | MIR-159 | `docs/stress/f3.md` — one line, its own key; one PR | MIR-156 |
| 3 | MIR-160 | `docs/stress/f4.md` — one line, its own key; one PR | MIR-157, MIR-158, MIR-159 |

The four delivery children already exist in `backlog`; the merge of this PR approves the set
and the Planner's wake promotes stage 2. MIR-160 is promoted only after stage 2 closes.

## Further Notes

- **What this buys.** The wake is single deterministically: the child set is final before
  stage 1 closes, so the condition that the platform re-evaluates cannot become true again
  when the slice is published.
- **What it costs.** The proposed tickets are visible before the approval. They are inert, but
  a human who rejects the spec has a published set to reconcile or cancel; the spec run owns
  that reconcile on FAIL, and cancelling the epic owns it on abandon.
- **The rerun is safe by construction.** Publication lists the parent's children and creates
  only what is missing; a partial publish is resumed, never duplicated.
- **Why the spec PR links only MIR-156.** The platform links a PR to the ticket key in its
  title, branch or closing reference. Naming the epic would link the spec PR to the epic, and
  the epic's completion would then be driven by a PR it did not author.
- **Unverified until later.** The single-wake claim, the unchanged child set, the MIR-160
  promotion and the Planner's acceptance are all observations this run cannot make. This
  document records the predicted outcome; the drill's result is the observed one.
- **Reversibility.** Reverting the merge removes the spec document; the published children are
  a separate, cancellable set, which is the visible price of approving a breakdown by merge.
