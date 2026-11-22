# Using the Factory workflow

The Factory workflow turns a spec into merged code. It is bound to every live project, so an
issue created in a project enters these columns; an issue outside a project uses the
workspace Default workflow, whose columns hand off to nobody.

The workflow file is the source: `templates/workflows/factory.json`. `just render-factory`
writes this guide's column table and status graph from it, and `tests/render-factory.test.js`
fails when the two differ. The prose around those blocks stays authored and is pinned by
`tests/factory-workflow.test.js`. This guide is the contract the human and the seats read. The
route allocation behind the graph is
[ADR-0004](adr/0004-columns-carry-agent-decided-routes.md); the approval artifact is
[ADR-0005](adr/0005-the-merged-spec-pr-is-the-approval.md); [ADR-0006](adr/0006-comment-first-merge-last.md)
records the handoff order and the auto-merge ban; [ADR-0007](adr/0007-publish-the-slice-in-the-spec-run.md)
moves the slice publication into the spec run; [ADR-0008](adr/0008-spec-approval-targets-the-integration-branch.md)
retargets the approval merge at the integration branch,
[ADR-0009](adr/0009-release-the-spec-as-one-squash.md) releases the spec as one squash on
`main`, and [ADR-0014](adr/0014-the-merge-exit-is-read-at-the-pass.md) reads the merge exit
once, at the PASS; [ADR-0016](adr/0016-every-grilled-slice-takes-the-integration-topology.md)
deletes the second topology and asks the labels at the kickoff. The change boundary is
[ADR-0019](adr/0019-the-slice-freezes-at-the-first-started-child.md), the one-ticket link and
the unlink correction [ADR-0020](adr/0020-one-pr-links-to-one-ticket.md), and the
rule/expected-snapshot/executed-set reading
[ADR-0021](adr/0021-the-spec-records-the-rule-not-the-live-state.md).
[ADR-0022](adr/0022-branch-names-are-ticket-ids.md) makes every branch a ticket id,
[ADR-0023](adr/0023-a-rewrite-is-leased-and-never-required.md) leases a rewrite,
[ADR-0024](adr/0024-every-ticket-names-a-planned-owner.md) names a planned owner,
[ADR-0025](adr/0025-the-epic-is-in-progress-from-the-kickoff.md) starts the epic in progress,
[ADR-0026](adr/0026-the-platform-wake-is-the-wake.md) makes the platform wake the promotion,
[ADR-0027](adr/0027-the-release-lane-does-not-serialize.md) removes the release query and
[ADR-0028](adr/0028-one-human-seat-per-workflow.md) names one human seat.

## Status graph

<!-- factory:graph:start (generated from templates/workflows/factory.json; do not edit) -->
```mermaid
flowchart TD
  backlog
  todo
  epic_progress
  spec_progress
  spec_review
  in_progress
  human_progress
  release_progress
  in_review
  human_review
  release_review
  awaiting_merge
  blocked
  done
  cancelled

  spec_progress --> spec_review
  spec_review --> awaiting_merge
  spec_review -.-> spec_progress
  in_progress --> in_review
  human_progress --> human_review
  release_progress --> release_review
  in_review --> awaiting_merge
  in_review -.-> in_progress
  human_review --> awaiting_merge
  human_review -.-> human_progress
  release_review --> awaiting_merge
  release_review -.-> release_progress
```
<!-- factory:graph:end -->

The graph is rendered from the workflow file: a solid arrow is the column's declared `next`, a
dotted arrow its declared `back`. Routes the instructions take beyond those edges — the
promotion into a work lane, the triage out of `blocked` — are rules in the prose, not a second
drawing. Any ticket can enter `blocked`; it is a triage column, never a parking spot. `done` and
`cancelled` are terminal and hand off to nobody. A merge completes the linked ticket: that is
the platform's PR rule, not a status edge. The four review columns all declare `awaiting_merge`
as their `next`, so the unattended advance is the human and the merge is the handled exception.
`epic_progress` is the epic's state and handles nobody: the Planner creates the epic in
`backlog`, moves it there at the kickoff when it starts the spec child, and moves it to `done`
on acceptance.

## The kickoff labels step

Every grilling produces an epic, so every published slice takes this one topology: a stage-1
spec child, the epic's key as the integration branch, the staged delivery children and a
final-stage release child. A single-ticket breakdown is the smallest epic — one delivery child
and the release — and a small task that never grills stays a regular ticket, the only PR into
`main` with no slice behind it.

The grilling packet ends on one close-and-start question: apply the chosen mode labels and start
stage 1. The labels are `has-human-implementer`, `has-human-release`, or neither, and they stay
the last field; a human mode reads the one human seat the project's workflow binds to the
`human` role from the live handler. The Planner applies the answer at the kickoff: it creates
the epic in `backlog` and the stage-1 spec child with the project and the planned owner, applies
the labels to the epic, records the `human` seat on the epic as a readback, then moves the epic
to `epic_progress` and the stage-1 child to `spec_progress`. The labels are set before the spec
PR exists, so the whole slice shares them; a label added later applies at the next PASS.

## The spec is a stage-1 child

The Planner creates the spec as the epic's stage-1 child in `backlog`, moves the epic to
`epic_progress` at the kickoff, and starts the child. In that child's run the Planner writes the
spec, forks the integration branch — the epic's key — from `main` at the spec sha before the spec
PR exists, publishes the whole slice with `to-tickets` — every delivery child under the epic, in
`backlog`, in stage order, each with its planned owner, the final-stage release child last — then
opens the spec PR, headed by the spec child's key and carrying the proposed breakdown, against
the integration branch, and links it only to the child, never the epic, and never after
`Closes`, `Fixes` or `Resolves`.
The Reviewer leaves the PR open on PASS and moves the child to `awaiting_merge`; the human
merges it, the workspace PR rule completes the child to `done`, and that completion wakes the
Planner to promote the frontier — not to slice. The merge still approves the spec and the set:
the children exist, but all are `backlog` and none has started.
No child is created after the merge that approves its set: the set is final before the child
closes.
Publishing before the child closes is what keeps the barrier wake single: the platform
re-evaluates the stage condition whenever the child set changes.

## One integration branch per spec

Each spec forks its integration branch — the epic's key — from `main` at the spec sha, before the
spec PR exists: a branch needs a commit. The spec PR heads the spec child's key and targets that
branch, and its merge approves the spec, its proposed breakdown and the published children
exactly as before. Every delivery child opens its body with `Branch: <epic-key>`; that line, not
a promotion comment, is the base the Implementer reads. The stage is the dependency edge and the
body carries no blockers. A final-stage release child owns the only path from the branch to
`main`.

```text
main ──fork at the spec sha──> <epic-key>
                                  │  spec PR (approval) ───────────┐
                                  │  ticket PRs (reviewed, merged) ┤
                                  └── release child: <release-key> → main ─┴──> one squash on main
```

The integration branch is scratch: it is unprotected and it deploys nothing. The release merge
deletes the release branch, and the Planner deletes the integration branch when it accepts the
epic, so no scratch branch outlives the slice. The branch's only jobs are to hold the reviewed
spec until it is complete and to keep half-finished work off `main`.

### The release child

The release child is published in the spec run, last, in `backlog`, in the final stage. Its
body carries its instance — base/source branch, included children and `Touch:` union; the
procedure itself lives in `roles/release.md`. It runs in `release_progress` and is reviewed at
`release_review`. Its PR heads the release child's key — the release branch — and targets
`main`: merge the current `main` in, resolve, run the full suite and open at that head. That
merge is one squash commit on `main` whose subject carries the release ticket's key — no merge
commit, no direct push — and it deletes the release branch because **Automatically delete head
branches** is on.

CI runs at spec level: the release PR and the post-merge `main` push, two runs per spec
independent of N. Ticket PRs into the integration branch run no check, which is why the
per-ticket gate is the Implementer's local run of the check that covers the diff. A red release
reworks on the release ticket at `release_progress`, on the branch, and re-runs at the refreshed
head; children that are already `done` stay `done`.

### `done` has two scopes

`done` has two scopes: branch-scoped `done` for a child and `main`-scoped `done` for the epic.
A child's `done` means it was delivered and reviewed on the integration branch. The epic's `done`
is `main`-scoped: after the release merge completes the release child, the Planner verifies the
release squash is on `main` at the merged sha with the release PR's checks green and only then
accepts the epic. The release child is the visible "this spec is not on `main` yet" marker; no
new status is introduced for the meaning between the two.

### Release order

At most one release is merge-ready against `main` at a time. Release order is the repository's
up-to-date requirement plus the Reviewer's `mergeStateStatus` read against `main` before the
release PASS: behind or dirty is a FAIL. There is no open-head query and no `--until-issue <release>` park. A release whose `main` moves while it waits merges `main` in
again and re-runs the suite: it never merges a stale tree. Where a dependency condition remains
— a cross-epic wait — it reads `--until-issue-state ended`, so a cancelled dependency releases
the wait. A package release such as release-please is outside the factory; the slice release is
the merge on `main`.

### The stale sweep

`stale-sweep` is the catalog's one stale-review guard: an hourly `0 * * * *` UTC autopilot in
the Planner role, mode `run_only`. It reads the four reviewer-handled columns — `spec_review`,
`in_review`, `human_review` and `release_review` — and dates each ticket from its `issue
timeline`, never from its last comment. A ticket two or more hours into its column gets one
`## What` / `## Evidence` / `## Next` comment carrying the age and the last actor, and then
moves to `blocked`; the comment is written first and the move is the last action.

It never sweeps `human_progress` or `awaiting_merge`: those wait indefinitely for the human, and
no agent may un-gate a human step. It never mentions anyone, never closes or cancels a ticket
and never runs on a `blocked` ticket. Triage restores the lane the timeline records; a second
sweep leaves a swept ticket in `blocked` for the human.

The first live run is the acceptance: the release reads the autopilot and its single enabled
hourly trigger back, and the first blocking move is the observable evidence.

### The cancelled-epic sweep

The cancelled sweep runs in the run that cancels the epic, as part of that run: no condition's
only trigger is a ticket's own closure. If the epic is cancelled before its release merges, the
sweep runs once and in order: close the open delivery and release PRs, delete the integration
branch, cancel the children that are still open, and record what merged and what is abandoned.
If the release already merged, do not cancel it: accept the epic, or open a follow-up spec — a
revert is a new epic.

## The reslice window and the freeze

A change is made in place only inside the reslice window: while the spec PR is unmerged, or after
its approval merge while no child has started. On an unmerged PR the Planner adds a commit to the
same head, so the number, link and body survive; a rewrite replaces that head only when the
commits themselves must not remain, on the Planner's own PR head, after a fetch, with
`git push --force-with-lease=<remote-ref>:<expected-sha>`, and never with `--force`, `-f`,
`--mirror`, `+`, `main` or the integration branch. After the merge it reopens the same spec child
at `spec_progress` and opens one revision PR against the integration branch. Either way the child
set and bodies are rewritten in place — list the children, create only the missing ones, edit the
rest, cancel the dropped — and the child returns to `spec_review` for a fresh PASS. No second
spec PR is open at once.

The window closes when the spec has merged and any child is in a started status: anything but
`backlog`, `todo`, `done` or `cancelled`. The freeze is a latch: once it holds, the slice stays
frozen for its life, so `done` never reopens it and a child parked in `blocked` counts as
started. A real change after the freeze is a new epic: the old epic runs to its release and is
not cancelled or amended, the new epic owns the change, and the affected acceptance criterion is
recorded as superseded and cited in the old epic's acceptance.

The spec records the rule, the named exceptions and the expected snapshot; acceptance is the
executed set. The reslice window is the named exception to the freeze, and a live-data delta that
leaves the rule, the exceptions and the acceptance unchanged is the named exception to
re-speccing: the delivering ticket reports the set it observed and every delta with the commit SHA
and the evidence, and the release verifies the report at the integrated head. A delta that changes
the rule takes the reslice or new-epic route instead.

## Columns

The column table and the presentation it carries are generated from the workflow file:

<!-- factory:columns:start (generated from templates/workflows/factory.json; do not edit) -->
| Column | Handler | Icon | Colour | Next | Back |
| --- | --- | --- | --- | --- | --- |
| `backlog` | none | — | — | — | — |
| `todo` | none | — | — | — | — |
| `epic_progress` | none | `half` | #0ea5e9 | — | — |
| `spec_progress` | Planner | `half` | #3b82f6 | `spec_review` | — |
| `spec_review` | Reviewer | `three_quarters` | #3b82f6 | `awaiting_merge` | `spec_progress` |
| `in_progress` | Implementer | — | — | `in_review` | — |
| `human_progress` | human | `half` | #8b5cf6 | `human_review` | — |
| `release_progress` | Release | `half` | #f97316 | `release_review` | — |
| `in_review` | Reviewer | — | — | `awaiting_merge` | `in_progress` |
| `human_review` | Reviewer | `three_quarters` | #8b5cf6 | `awaiting_merge` | `human_progress` |
| `release_review` | Reviewer | `three_quarters` | #f97316 | `awaiting_merge` | `release_progress` |
| `awaiting_merge` | human | `three_quarters` | #8b5cf6 | — | — |
| `blocked` | Planner | — | — | — | — |
| `done` | none | — | — | — | — |
| `cancelled` | none | — | — | — | — |
<!-- factory:columns:end -->

`done` and `cancelled` hand off to nobody. Custom statuses carry the presentation that sync
reconciles and reads back; a system status declares none. A column's declared `next` and `back`
are the only edges the graph owns; the route its instruction takes beyond them — the promotion
into a work lane, the triage out of `blocked` — is a rule in the prose.

## Promotion and the exit rule

The two labels compose into four modes — autonomous, `has-human-release`,
`has-human-implementer`, and both — but promotion selects only who implements:

| Epic labels | Ticket | Lane |
| --- | --- | --- |
| any | spec child | `spec_progress` |
| neither or `has-human-release` | delivery | `in_progress` |
| `has-human-implementer` | delivery | `human_progress` |
| any | release | `release_progress` |

The Planner reads the ticket's kind from its stage, not from a body marker; the same four-row
table is the one in `roles/planner.md`. `has-human-release` is not a promotion input. Who merges
is the exit rule in `skills/code-review/`, read at each PASS from the PR's base and the epic's
label and never cached in a lane:

- `spec_review`: a PASS moves to `awaiting_merge` in every mode — the spec-approval exception
  (D4), read before the base and the label.
- `in_review`, `human_review`, `release_review`: a PASS merges at the reviewed head when the base
  is the integration branch, or when the base is `main` and the epic carries no
  `has-human-release`; it moves to `awaiting_merge` when the base is `main` and the epic carries
  `has-human-release`.

A label added after the kickoff applies at the next PASS; a change to the slice's set still needs
a spec re-approval. `has-human-release` is scoped to the boundaries, not to every ticket: it
gates every pull request whose base is `main`, while the spec approval is the human merge in
every mode. A ticket PR into the integration branch is Reviewer-merged in every mode, because
the branch is scratch and the human already approved the set that produces it. Under
`has-human-release`, one topology costs two human merges — the spec approval and the release.

The smallest epic is the same topology: one delivery child and the release child.

The spec lane runs in every mode: the Planner writes the spec at `spec_progress`, publishes the
slice, the Reviewer verdicts it at `spec_review`, and a PASS always lands at `awaiting_merge`.
The spec PR carries the proposed breakdown, and the human merge of that PR approves the spec,
the breakdown and the published children, in every mode, including autonomous.

To route one ticket to a human, assign that member and move it to `human_progress`; assigning
alone starts nothing. `todo` is a waiting room, not a handoff.

## Who moves what

- **Human.** The spec PR is the approval: it carries the proposed breakdown and the published
  children, so merging it approves the spec and the set. Implement a
  `has-human-implementer` ticket at `human_progress`, open its PR against the ticket's
  `Branch:` base, and move it to `human_review`. At `awaiting_merge`, merge the reviewed PR:
  the merge completes the ticket, so do not move it to `done` yourself. Only a spec approval or
  a review the exit rule sent there reaches you; a ticket PR into the integration branch is
  Reviewer-merged. Never move human work into `in_progress`.
- **Planner.** Create the epic in `backlog` and the stage-1 spec child; at the kickoff apply the
  chosen labels to the epic, record the one `human` seat from the live handler on the epic as a
  readback, move the epic to `epic_progress`, and move the stage-1 child to `spec_progress` last.
  In that child's run, fork the integration branch — the epic's key — from `main` at the spec sha,
  write the spec recording `integration:`, and publish every delivery child in `backlog` with its
  planned owner, its stage and its `Branch:` base, the final-stage release child last. Then link
  the spec PR, targeted at the integration branch, to the child only. The merge approves the set
  and wakes you to promote, not to slice: create no child after the merge that approves its set,
  and make a change inside the reslice window a revision, after the freeze a new epic. Promote
  the frontier by the four-row table in `roles/planner.md`, applying `ready-for-agent`; keep later
  stages in `backlog`. Release order is the repository's up-to-date requirement and the Reviewer's
  `mergeStateStatus`, so there is no open-head query and no park. Triage `blocked`, accept the epic
  on evidence after the release merge with the release readback, delete the integration branch,
  and run the cancelled sweep in the run that cancels the epic.
- **Reviewer.** Owns `spec_review`, `in_review`, `human_review` and `release_review`: one
  verdict at the exact head, evidence per criterion, then the move or the merge. Post the
  verdict first, at the reviewed head, before the status move or the merge: the move starts the
  next handler and the merge completes the ticket, so anything written afterwards arrives too
  late for both. A spec PASS reviews the spec and its proposed breakdown, leaves the PR open and
  then moves to `awaiting_merge`; never merge or enable auto-merge on a spec PR. A delivery or
  release PASS posts the verdict at the exact head and then applies the exit rule in
  `skills/code-review/`: merge at the reviewed head, or move to `awaiting_merge` when the base is
  `main` and the epic carries `has-human-release`. A release PASS checks `mergeStateStatus`
  against the current `main` first. FAIL comments the evidence and moves the ticket to the review
  column's back status. A review starts from an open pull request: with no open link, comment the
  state and send the ticket back rather than judging or completing it. The Reviewer never
  reviews its own work.
- **Implementer.** Owns `in_progress`: read the ticket's `Branch:` line at the top of its
  body, branch from that base (`main` when absent), open the PR against it, merge the base in
  before `in_review`, then implement, validate and link the PR.
- **Release.** Owns `release_progress` into `release_review`; the procedure and the deploy-time
  `production:` approval live in `roles/release.md`.

## The handoff is proved

The linked pull request is the delivery handoff: entering a column reassigns the issue to that
column's handler and starts their run; a member handler is assigned and runs nothing. The link
comes first: after a run opens a pull request it reads the ticket's linked pull requests and moves
only when the PR is listed. An empty read is the operator's fix — the wrong key, a URL relink, or
the repository integration — and a `blocked` move, never a started lane. A ticket holds one open
linked PR: a second open link, or a link to a ticket the PR does not deliver, is a blocking finding
at review. Nothing advances a ticket
when a run ends, so the handler always makes the next move; the link and the move are the whole
handoff. The PR body is optional: it carries only what the diff cannot say, and an empty body is
not a finding.

## Commits

One pull request is one squash commit on the branch it targets, and the PR title is the
subject: `type(scope): summary, TICKET` — Conventional Commits, then a comma, then the ticket
key. The key is the delivering ticket's, never the epic's; the head branch carries it too, and a
spec child's title names the change without repeating the epic key. GitHub appends the pull
request number to the squash, `(#42)`; that is the only parenthesis in the subject and nobody
types it. Never use a merge commit and never rewrite the squash subject. The PR body carries the
detail; the subject carries the two identifiers and nothing else.

## Edge cases

- **Review send-back.** Each review column declares its own back status: `spec_review` to
  `spec_progress`, `in_review` to `in_progress`, `human_review` to `human_progress`,
  `release_review` to `release_progress`. The platform's needs-changes control uses that
  declared status, so a send-back cannot hand a ticket to the wrong seat.
- **Merge is the transition.** No review column declares `done`: every review column declares
  `awaiting_merge` as its `next`, and a PASS either merges at the reviewed head or moves the
  ticket there. A merge completes the ticket; moving it to `done` by hand would close it without
  a merge, so don't. A change request moves it to the lane that owns the work.
- **The release is a delivery PR with a `main` base.** The release child is reviewed at
  `release_review`: a PASS applies the exit rule, merging in autonomous mode and landing at
  `awaiting_merge` when the epic carries `has-human-release`. It is not a second approval — the
  spec merge approved the set, and the release adds no criteria of its own. A red release
  reworks on the release ticket at `release_progress`; its `done` children stay `done`.
- **A cancelled epic is swept once.** The sweep in "The cancelled-epic sweep" is mechanical:
  close the open delivery and release PRs, delete the integration branch, cancel the remaining
  children and record what merged and what is abandoned. It runs in the run that cancels the
  epic, never from a condition whose only trigger is that closure.
- **Auto-merge stays off.** Leave **Allow auto-merge** off on every Factory repository. Auto-merge
  is a pull-request setting, not a ticket status: an armed PR merges as soon as its checks pass,
  and the platform completes the linked ticket on merge — including an
  `awaiting_merge` ticket and a spec child. An arm would therefore bypass the human gate, and
  a spec merge would approve an unreviewed set and wake the Planner to promote it. The Reviewer
  merges after a PASS instead, and GitHub refuses an arm while the setting is off.
- **A close is not a workflow event.** The platform completes a ticket on merge and does
  nothing on a close: a closed, unmerged PR changes no status, wakes nobody, and is not an
  automatic rejection — rejected, superseded, rebased and cancelled PRs all close the same
  way, so a close cannot be assumed to mean any of them. The actor who closes the PR owns the
  move — `cancelled` for abandoned work, or the lane that owns the rework, with the reason on
  the ticket — and the actor who closes the PR owns the unlink: `multica issue pull-requests
  unlink` removes the closed link before a replacement is linked.
- **A review needs an open PR.** Each review column checks the link before judging: with no
  open pull request there is nothing to review, so the Reviewer comments the state and moves
  the ticket to that column's back status. This is a precondition on entry, not a reaction to
  a close — nothing in the graph fires on one.
- **Spec approval.** The spec child is approved by merging its PR, which completes the child
  and wakes the Planner. The PR heads the spec child's key and targets the integration branch,
  and carries the proposed breakdown and the published children, so the merge approves both;
  the children already exist in `backlog`, and the wake promotes the frontier. A spec PR is
  reviewed at `spec_review`, never at `in_review`, and the Reviewer never merges or enables
  auto-merge on it.
- **Publishing before approval.** The spec run publishes the children before the merge because
  creating them after it is exactly the child-set change that fires the barrier twice. They are
  a proposed set, not approved work: all `backlog`, none in a running status, no
  `ready-for-agent` until the promotion wake. On a spec FAIL the spec run reconciles them to the
  revised breakdown; if the epic is abandoned, cancel them with it.
- **Blocked.** Any seat can move a ticket to `blocked`. The Planner triages it back to the lane
  its timeline records, or cancels it. A cross-epic dependency is an `--until-issue` condition,
  not a ticket section: the ticket stays in `blocked` until that condition clears.
- **Cancel and duplicate.** Move to `cancelled`; use `--duplicate-of` so the original lists it.
- **Branch cleanup.** Enable **Automatically delete head branches** on the repository. Every
  delivery merge deletes its head branch and the release merge deletes the release branch; the
  Planner deletes the integration branch on acceptance. A merge from the GitHub UI relies on that
  setting, and the catalog cannot set it. Auto-merge is off, so no deferred merge exists.
- **Issue outside a project.** The workspace Default workflow accepts every status and hands
  off to nobody. The Factory promotion above does not apply until the issue is in a project.
- **Manual override.** Any member can move a ticket to any column; the move is the handoff and
  the new handler takes over. A named workflow refuses a status it does not declare.
- **Stage barriers.** A stage is a parallel barrier group, not a position label: serial
  tickets get distinct stages, the spec run creates every later stage in `backlog`, and the
  platform's parent stage wake promotes the frontier — no children-done condition is armed. The slicing rules live in `roles/planner.md` and the `to-tickets` skill.

## Live acceptance

The offline matrix pins the graph and the promotion routes; it cannot prove the platform's
handoff. Run this once after a catalog change reaches a workspace, in a throwaway project
with a repository resource and the Factory workflow bound.

| Scenario | Shape | Expected evidence |
| --- | --- | --- |
| ticket-id link | a spec child and a delivery child whose PR heads are their own keys | each PR links to its own ticket; the merge completes that ticket; the title and the head name the same key |
| bare-key review | a PR body, a proposed breakdown or a spec comment with a bare ticket key | the review reads the live text in its link check and fails it on Standards; the author links the key; no PASS stands over a bare key |
| no epic link | a spec merge and a release merge with the epic still open | the epic holds no linked PR; the release child holds its release PR; the epic's state moves only by the Planner's hand |
| native wake | a stage whose children all close while a later stage waits | one Planner run starts from the platform's parent wake and promotes the frontier; no children-done condition exists |
| one conflicts rule | a reviewed PR revisited twice | `wakeup list` shows one conflicts rule; `wakeup update` replaces it in place; a second rule is never created |
| no unassigned | a published set with a human-lane child | every child carries a planned owner, the human lane's being the live `human` handler's member; the spec PASS finds no ownerless child |
| no serialization | two slices with a release each | no open-head query runs; the second release waits on the Reviewer's `mergeStateStatus` read, with the up-to-date requirement where the repository carries it; a missing requirement is reported as an operator delta, not filled by a park |
| release readback | the release merge completes the release child | the Planner's acceptance run reads the squash on `main`, the checks and the applied catalog back; no wakeup on the release child is registered |
| cancelled sweep | an epic cancelled before its release merges | the run that cancels the epic closes its open PRs, deletes the integration branch, cancels the remaining children and records what merged and what is abandoned |
| autonomous | epic, spec child + three parallel children + one serial child | the whole slice already exists in `backlog` when the spec PR is reviewed; the human merge completes the child and a **single** Planner wake promotes the parallel stage (no child is created after the merge); each PASS is posted before its delivery PR merges and closes the ticket |
| integration topology | the same slice with the fork, the release child and filtered triggers | the spec PR and every delivery PR target the integration branch; a child's PASS merges into the branch and completes the child, with no CI run started for the branch; the release child runs in `release_progress`, is reviewed at `release_review`, runs the repository's checks and lands as one squash on `main`, deleting the release branch; the Planner then deletes the integration branch on acceptance |
| smallest epic | a single-ticket breakdown | the slice publishes one delivery child and the release, all `backlog`; the spec PR and the delivery PR target the integration branch, and the release is the only path to `main` |
| spec rework | a spec FAIL after the slice is published | the children stay `backlog`; the spec run reconciles them to the revised breakdown; no run starts |
| human merge | `has-human-release` epic | PASS lands at `awaiting_merge`; the human merges and the merge completes the ticket |
| human implements | `has-human-implementer` epic | the ticket sits in `human_progress` assigned to the human; its PR is reviewed at `human_review`, the PASS is posted, then merged |
| human implements and merges | both labels | `human_progress` to `human_review` to `awaiting_merge`; the human merges |
| blocked | any ticket moved to `blocked` | the Planner triages it back to the lane its timeline records, or cancels it |
| dependency | a ticket parked on an `--until-issue` condition | it stays in `blocked` until that issue closes |


Record `multica issue timeline <id>` before closing each item: it carries the status and
assignee changes that prove the route. Put the result on the test issue, not in this
repository: the catalog is stateless, and this guide is the procedure, not a workspace
record. Cancel the test tickets and close the test PRs afterwards, then delete the throwaway
project.

## Verification

`just render-factory` rewrites the generated column table and graph; `just validate` resolves the
catalog; `just test` runs the offline matrix, including the render check. All three are offline
and need no workspace.
