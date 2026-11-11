# One integration branch per spec, released as one squash

Accepted 2026-11-11. Approval is the merge of this spec's pull request into `spec/MIR-162`,
which completes MIR-163 and approves the published set; MIR-162 is the epic and stays `todo`
until the release lands and the Planner accepts it on evidence. The decisions below are the
answers given in the grilling session that opened the epic; ADR-0008 and ADR-0009 are their
durable records, and they supersede the approval target and the release consequence of
ADR-0005 without editing it.

## Problem Statement

A Factory spec is delivered as N ticket pull requests straight into `main`. The model has
three costs and one collision.

**The release unit is a ticket.** `main` carries whatever subset of a spec has merged so far.
There is no point at which the repository holds a complete, reviewed spec and nothing else
unfinished from it. A half-delivered spec is indistinguishable from a finished one by looking
at `main`.

**Every ticket merge re-runs the whole check.** Each ticket PR runs the repository's checks
once and each merge pushes `main` and runs them again: `2N + 2` runs for an N-ticket spec. On a
repository whose full suite is a 30-minute job this is not a rounding error. One private
consumer repository stopped it by making every workflow `workflow_dispatch` only, which did not
filter the noise — it removed the automated gate and left the implementer's local run as the
only check. The goal is to restore that gate without restoring the spam.

**Parallel specs collide.** Two specs in flight both merge into `main`. The second release is
behind the moment the first lands; with an up-to-date requirement it must merge `main` in,
re-run the full suite and get a fresh verdict. S specs in flight approach O(S²) suite runs, and
the conflict resolution is spec-level work no ticket reviewed.

**The collision is `done`.** The platform completes a ticket when a linked pull request merges
and does not care about the base. Put delivery PRs on an integration branch and every child
becomes `done` while `main` still has none of it. `done` would silently mean "on the branch",
and no column would say "this spec is not released".

The implement-spec method already has the right shape for this: one integration branch per
spec, a fresh worker per ticket against the branch tip, one end-of-spec review, one final
merge. What it does not have is a tracker: the Factory's one-issue-run-per-ticket model is what
makes a failed ticket cost one ticket instead of the whole spec, so the branch topology is the
part to borrow, not the fan-out.

## Solution

Each spec forks `spec/<epic-key>` from `main` at the spec sha. The spec PR and every delivery
PR target that branch. A final-stage release child merges `spec/<epic>` → `main` as one squash
commit. The spec's merge is still the one approval act; only its target moves.

```
main ──fork at spec sha──> spec/MIR-162
                               │  spec PR (approval) ─────────────┐
                               │  ticket PRs (reviewed, merged) ──┤
                               └── release child: spec → main ────┴──> one squash on main
```

CI runs at spec level: the release PR and the post-merge `main` push, two runs per spec
independent of N. Per-ticket delivery is gated by the Implementer's local run of the check that
covers the diff, which the role already demands; nothing pretends CI validated each ticket.

`manual-merge` is narrowed to the merges that cross `main` — the spec approval and the release
— plus every PR whose base is `main`. A ticket PR into `spec/<epic>` is Reviewer-merged in
every mode, because that branch is scratch, deploys nothing, and the human already approved the
set that produces it. Integration plus `manual-merge` therefore costs two human merges, not
N + 2.

A child's `done` is branch-scoped. The epic's `done` is `main`-scoped, and only the Planner's
acceptance after the release merge closes it. The release child is the one place "this spec is
not on `main` yet" is visible.

`direct-to-main` is the escape hatch: no branch, no release child, the spec PR targets `main`,
and per-ticket CI returns — which is why it stays for single-ticket and hotfix specs. Every
spec records `integration: spec/<epic>` or `integration: none`.

## User Stories

1. As a maintainer, I want one integration branch per spec, so that `main` only ever receives a complete, reviewed spec.
2. As a maintainer, I want a spec to land on `main` as one squash commit, so that the release is one revertable unit.
3. As a maintainer, I want the repository's full suite to run twice per spec instead of `2N + 2` times, so that restoring the gate does not restore the noise.
4. As a maintainer, I want the filtered trigger shape documented per repository, so that a new repository can adopt the gate without rediscovering the filter.
5. As a maintainer, I want two specs in flight to serialize at the release, so that neither release branch is rewritten while it is being reviewed.
6. As the approval owner, I want the spec merge to remain the single approval act, so that batching does not add a second gate.
7. As the approval owner, I want the spec PR to target the integration branch, so that approving a spec does not put half of it on `main`.
8. As the approval owner, I want `manual-merge` to mean "every merge onto `main`, plus the approval", so that a human gate costs two merges, not one per ticket.
9. As the approval owner, I want an integration spec's children to be Reviewer-merged into the branch, so that my clicks land only where a boundary is crossed.
10. As the approval owner, I want a cancelled epic to unwind cleanly, so that abandoning a spec does not leave PRs, a branch and open children behind.
11. As the Planner, I want the spec run to fork the branch before the PR exists, so that the spec PR has a base without merging to `main`.
12. As the Planner, I want `Branch: spec/<epic>` in every delivery child's body, so that a fresh Implementer run does not have to infer its base.
13. As the Planner, I want the release child published in the spec run, in the final stage, so that the set is final before stage 1 closes and one wake promotes the frontier.
14. As the Planner, I want the spec to record `integration:` or `none`, so that the choice survives a rework and a later reader can see it.
15. As the Planner, I want to serialize releases with one query before promoting, so that no release branch accumulates a second refresh.
16. As the Planner, I want to accept the epic only after verifying the release squash on `main`, so that `done` at the epic level means released.
17. As the Implementer, I want my ticket's base in the ticket body, so that I can branch, implement and open the PR without asking.
18. As the Implementer, I want to merge the integration branch in before `in_review`, so that the reviewed head is the head that merges.
19. As the Implementer, I want a rework to force-push the same head branch, so that the PR link, number and body survive.
20. As the Reviewer, I want to review a ticket PR against the branch, so that a sibling merge surfaces as a conflict before the release.
21. As the Reviewer, I want the release verdict to check `mergeStateStatus` against the current `main`, so that a PASS is never a claim about a stale tree.
22. As the Reviewer, I want a moved base to invalidate the verdict exactly as a moved head does, so that approval stays exact.
23. As the Reviewer, I want the release review to re-check a child's criterion only where integration changed it, so that it is one review, not N reviews repeated.
24. As a human, I want a red release to rework on the release ticket, so that done children stay done and no promoted stage is un-closed.
25. As a human, I want a single-ticket spec to default to `direct-to-main`, so that the ceremony never lands on a one-line change by accident.
26. As a human, I want the repository prerequisites listed beside the existing auto-delete note, so that adopting the topology is a checklist, not folklore.
27. As the release role, I want `main` to carry a tested tree and the release PR's checks, so that a deployable artifact is a fact, not an inference.
28. As a future maintainer, I want the decisions in an ADR and an accepted spec, so that the topology is reversible with evidence rather than archaeology.

## Implementation Decisions

**D1 — Both goals, and they are separate.** Fewer CI runs and atomic release are both wanted,
and parallel specs are expected. The branch topology serves atomicity; the trigger filter
serves volume. Neither is allowed to be justified by the other.

**D2 — CI is spec-level, with no per-ticket gate.** Branch protection and required checks live
on `main`. Ticket PRs into an integration branch merge on the Reviewer's verdict and the
Implementer's local run. The trade is explicit: two runs per spec, not one per ticket, and no
pretence that CI saw each ticket.

**D3 — The topology only; one issue run per ticket stays.** No orchestrating run that spawns
implementer subagents. Fresh context per ticket, the handoff comment, and the tracker's audit
trail remain the survival mechanism; a failed run costs one ticket.

**D4 — `done` is branch-scoped, the epic is `main`-scoped.** A child `done` means "delivered
and reviewed on the branch". The epic reaches `done` only by the Planner's acceptance after
the release squash is verified on `main`. No new status is introduced for the intermediate
meaning; the release child carries it.

**D5 — Releases serialize per repository.** At most one release is merge-ready against `main`.
The Planner queries `gh pr list --base main --state open` filtered to `spec/*` heads before
promoting, and parks the next release on `--until-issue <release> --until-issue-state done`
until the previous one closes.

**D6 — One squash per spec on `main`.** The release PR is one PR with N reviewed ticket
commits; it lands as one squash whose subject carries the release ticket's key. `AGENTS.md`
allows no merge commits. Per-ticket history stays in the tracker and the delivery PRs.

**D7 — Repo triggers filter to `main`.** A repo adopting the topology declares
`push: branches: [main]` and `pull_request: branches: [main]`. That is what makes the spec PR
and the ticket PRs free, and the release PR plus the post-merge push the only runs. The
post-merge run stays: it is where a deployable artifact and release bookkeeping belong, and it
is the only check of the merged tree.

**D8 — Integration is the default; `direct-to-main` is the escape hatch.** The label removes
the topology entirely. A spec whose approved breakdown is a single ticket defaults to it
without anyone remembering a label; the Planner decides at slice time and records it in the
spec.

**D9 — The merge is still the one approval act, retargeted.** The spec run pushes
`spec/<epic>` at the fork sha (a branch needs a commit), the spec PR targets it, and its merge
completes the spec child and approves the spec, breakdown and set. No `spec_approval` column,
no `spec_approved` hop, and no comment-triggered wake. A comment written in `awaiting_merge`
is the record, not the trigger.

**D10 — The release follows the epic's mode.** Autonomous: the Reviewer posts the verdict at
the exact head and merges the release PR. `manual-merge`: the Reviewer moves it to
`awaiting_merge` and the human merges. A release-only gate would be a new mode in disguise.

**D11 — The release child carries the procedure and the evidence.** Body: the spec link at the
approved revision, `spec/<epic>` → `main` as base/head, the included children with keys and
their merged PRs and `Touch` paths, the refresh procedure (merge `main` in, resolve, run the
full suite), and acceptance re-verified at the integrated head. Its `Touch:` is the union of
the children's paths plus the spec. `done` proves the release PR merged and `main` carries the
spec and the tested tree.

**D12 — A red release reworks on the release ticket.** Back to `in_progress`, fixed forward on
the branch: integration glue, paths outside any child's `Touch`, a small correction to a
child's criterion at most. `done` children stay `done`; reopening one would un-close a stage
the barrier already promoted. A failure that proves a child's acceptance claim false is a
finding recorded on the release.

**D13 — A cancelled epic is swept once, mechanically.** At approval the Planner registers
`--until-status cancelled` on the epic. The wake closes the open delivery and release PRs,
deletes `spec/<epic>`, cancels remaining children, and records what merged and what is
abandoned — in that order. If the release already merged, do not cancel: accept, or open a
follow-up spec; a revert is a new epic.

**D14 — The Planner accepts the epic on evidence.** After the release merge completes the
release child, the final-stage barrier wakes the Planner. It verifies the release squash is on
`main` at the merged sha with the release PR's checks green, then moves the epic to `done`.
The release PR is linked only to the release child, never the epic; a red post-merge `push:
main` run is recorded as an incident, not a hold.

**D15 — `manual-merge` is scoped to the boundaries.** It gates the spec approval (whatever its
base) and every PR whose base is `main`. Ticket PRs into `spec/<epic>` are Reviewer-merged in
every mode. Integration with `manual-merge` is two human merges; `direct-to-main` with
`manual-merge` keeps today's N + 1.

**D16 — The delivery branch lives in the ticket body.** `Branch: spec/<epic>` under
`## Parent` in every delivery child; absence means `main`. A branch name, never a sha: the tip
moves as tickets merge, and the body is the artifact the Implementer's run opens. A promotion
comment is a message about an event, not the artifact.

**D17 — The base is part of the reviewed head.** The Implementer merges `spec/<epic>` into the
ticket branch before `in_review`, so the reviewed head already contains the sibling merges.
A moved base invalidates a verdict exactly as a moved head does. Same-stage siblings with
disjoint `Touch` paths are a slicing preference, not a rule — the Planner cannot know every
path a slice will touch.

**D18 — A spec rework force-pushes the same head branch.** The workspace PR rule keys on the
issue key in the title or branch, not the base, so the link, number and body survive. Never
close and reopen: there is no CLI unlink for a closed linked PR, so a close would need a human
to clear the stale link first.

**D19 — `direct-to-main` is exactly today's graph.** No `spec/<epic>`, no release child, the
spec PR targets `main`, children PR to `main`, the epic is accepted once every child closes —
and per-ticket CI comes back. The spec records `integration: none`.

**D20 — Repository prerequisites are operator state.** `spec/*` unprotected (it is scratch;
its only PR is the approval), **Automatically delete head branches** on (it now also deletes
the release PR's head), **Allow auto-merge** off, and **Require branches to be up to date** on
`main`. Up-to-date is what turns the release PASS into a claim about the tree that merges.

**D21 — Serialization is a query plus the existing guard.** The Planner's pre-promotion query
and the `--until-issue` re-arm; no release-lane label and no `--until-pr conflicts` wake (a
moved `main` without a textual conflict shows as behind and never fires it). Freshness belongs
where the verdict is: the Reviewer checks `mergeStateStatus` before a release PASS, and the
human's merge button is the second detector. The existing 90-minute review check stays as the
stuck-at-`awaiting_merge` guard; no new wake.

## Testing Decisions

The seam is the existing offline matrix, not a new module: `tests/factory-workflow.test.js`
reads the resolved workflow, `docs/factory.md`, the roles and the two skills, and pins the
routes and the contract text together. `just validate` proves the catalog resolves and
`just test` runs that matrix plus the docs and anonymity checks. The tests assert external
behaviour — the contract a run actually renders, the route a column declares, the guide a human
reads — never the bytes of a spec or an internal helper.

- **The Planner's side is pinned in the matrix.** The `spec_progress` instruction and
  `roles/planner.md` must name the fork, the `spec/<epic>` target, the `Branch:` line, the
  release child and the serialization query; `to-spec` and `to-tickets` must record
  `integration:` and publish the release child in `backlog` in the final stage. A main-only
  spec run must fail the matrix.
- **The delivery side is pinned in the matrix.** `in_progress` must read the ticket's
  `Branch:` and merge the base before `in_review`; `in_review`/`human_review` must merge into
  the recorded branch in every mode and apply `manual-merge` only to main-base merges; the
  Reviewer contract must name `mergeStateStatus` and base-or-head invalidation.
- **The guide is pinned with the contract.** `docs/factory.md` must name the integration
  branch, the release child, the branch-scoped `done`, the two-merge `manual-merge`, release
  serialization and the cancellation sweep; the existing assertions that every column, label
  and mode appears stay.
- **The change set is a change set, not a rewrite.** Each delivery PR names only its `Touch:`
  paths; an unlisted path is a finding. The release ticket's change set is the union plus the
  spec and ADRs.
- **The live claims are observed, not assumed.** The trigger arithmetic, the single release
  squash, the barrier wakes, the serialization and the cancellation sweep are platform facts
  the offline suite cannot prove. They are recorded as unverified here and become the lived
  first instance of this spec (Further Notes); a later spec may add them to the guide's live
  acceptance table.

## Out of Scope

- Platform changes: the PR-completion rule, statuses, wakeup conditions and the stage barrier
  are the platform's, and this spec uses them as they are.
- Repository settings applied by the catalog. Branch protection, auto-delete and workflow
  triggers are repository state; the contract documents them and the operator owns them.
- Reworking the `human-assigned` mode. Human implementation keeps its columns; only
  `manual-merge` is narrowed.
- A new column or status for spec approval, release readiness or "merged to spec". D9 and D4
  deliberately use existing columns and the release child.
- Re-enabling per-ticket CI, auto-merge, or a second required check.
- Retroactively rebasing history or rewriting the accepted specs.
- A live acceptance drill in a consumer repository.

## Proposed breakdown

| Stage | Ticket | Outcome | Blocked by |
| --- | --- | --- | --- |
| 1 | MIR-163 | This spec, the recorded topology and the published set; approved by this PR's merge | — |
| 2 | MIR-164 | The Planner contract: fork, record, publish, target the branch, create the release child, serialize and sweep | MIR-163 |
| 3 | MIR-165 | The delivery and review contract: body-derived base, base merged before review, `mergeStateStatus`, narrowed `manual-merge` | MIR-164 |
| 4 | MIR-166 | The guide, the per-repo prerequisites and this repository's filtered trigger | MIR-165 |
| 5 | MIR-167 | Release `spec/MIR-162` → `main` as one squash; re-verify the spec at the integrated head | MIR-164, MIR-165, MIR-166 |

All five children exist in `backlog`; the merge of this PR approves the set and the Planner's
wake promotes stage 2. Stages 2–5 are serial because they edit the same contract files, and a
stage is a barrier group rather than a position label.

## Further Notes

**The arithmetic.** For an N-ticket spec, `direct-to-main` costs `2N + 2` runs (each ticket PR,
each merge push, the spec PR and its merge push). Integration with the filtered triggers costs
two: the release PR and its merge push. During the transition — before a repository's triggers
are filtered — its ticket PRs into `spec/<epic>` still run, so the saving arrives with D7, not
with the branch alone.

**This spec is its own first instance.** `spec/MIR-162` was forked from `main` before the spec
PR existed, this PR targets it, and MIR-167 is the only path to `main`. The live claims above
are therefore not a future promise: the merge of this PR, the delivery merges and the release
merge are the first observation of the topology. If it fails, the failure is on this epic, not
in a drill.

**Why ADR-0005 is not edited.** ADRs are immutable once accepted (`docs/adr/README.md`); a
later decision is a new file that supersedes the earlier one. ADR-0008 supersedes 0005's
approval target and ADR-0009 supersedes its release consequence. 0005's actual decision — one
artifact, one approval act, the merge — stands unchanged.

**What integration costs.** A release child, a refresh on a moved `main`, and a spec-wide
review. A single-ticket spec would pay all three for nothing, which is why D8 sends it to
`direct-to-main` by default.

**Reversibility.** Nothing here is a platform feature that must be unwound. Reverting the
release squash restores main-only delivery; a spec that wants the old graph carries
`direct-to-main` the same day. The one-way door is a half-released spec, which D12 and D13
close.
