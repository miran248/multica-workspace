# Platform realignment

`integration: spec/MIR-304` — forked from `main` at `074cd90`. This is the last `spec/<epic>`
slice: the ticket-id topology applies from the next epic, and the transition is the one named
exception. The spec is delivered under the live topology, so the record is what a rework and a
later reader check against.

Accepted 2026-11-21. Approval is the merge of this spec's pull request into `spec/MIR-304`, which
completes MIR-305 and approves the published set — MIR-306 in stage 2 and the release child
MIR-307 in stage 3. MIR-304 is the epic: `epic_progress` from the kickoff, and the Planner accepts
it on evidence after the release lands. ADR-0022 records the ticket-id topology, ADR-0023 the
leased rewrite, ADR-0024 the planned owner, ADR-0025 the epic state, ADR-0026 the wakeups,
ADR-0027 the release lane and ADR-0028 the human seat. They supersede the named parts of
ADR-0008/0009/0013/0015/0017/0019/0020 — and of ADR-0004, ADR-0011, ADR-0012, ADR-0014 and
ADR-0016 where the same stale sentence lives — and leave every other decision standing.

## Problem Statement

The 2026-11-21 audit found ten contradictions between the catalog and the platform it runs on.
Each is a rule the catalog states and the platform does not behave as the rule assumes:

1. **A rework must force-push.** ADR-0008, ADR-0019, the Planner contract and the step say a spec
   rework force-pushes the same head. The platform accepts an added commit and the review keeps
   its history; the mandate makes an ordinary correction cost a rewrite of the one head with the
   most history to lose, and the guard around the force is silence.
2. **The integration branch and the release head are prefixed.** `spec/<epic>` is both, so the
   release PR's head names the epic. The platform links a pull request to the issue its title or
   head names, so an epic-keyed head is how a head can complete the epic — ADR-0018 records a spec
   PR whose title and branch carried the epic's key and whose merge completed the epic. Every head
   is a `spec/` or `agent/` prefix, so a PR's identity is its title and the head can drift from
   the ticket it delivers.
3. **The human lane is created unassigned.** ADR-0017, shared and `to-tickets` exempt the human
   lane from the planned owner; the platform assigns members and the workflow already binds one
   to `human`. The spec PASS then reads every child's owner and exempts the one lane whose owner
   it cannot name.
4. **The epic is created in `todo`.** ADR-0013 and the grilling skill open the epic there; on an
   agent-assigned issue a non-`backlog` create enqueues a run, and `epic_progress` is unreachable
   until the first promotion, so a slice under way reads as queued.
5. **`wakeup create` is re-armed as if it replaced.** ADR-0015 and the review contract register
   the conflicts condition with `wakeup create --mode continuous` and say the command replaces the
   configuration. `create` adds a rule; re-arming at every review duplicates it, and `update` is
   the command that replaces one rule's whole configuration.
6. **The promotion barrier is armed by hand.** The Planner contract and the suite carry "one
   `--until-children-done --stage N` barrier per promotion". The platform already wakes the
   parent assignee when a stage closes while a later stage waits; the second condition is a
   duplicate wake that must be replaced on every promotion.
7. **The closing conditions cannot fire as wakeups.** The guide registers the `--until-status
   cancelled` sweep on the epic and leaves the release readback as the Planner's verification after
   the release merge. A condition whose trigger is the ticket's own closure is disabled by that
   closure, so the cancelled epic cannot wake its sweep; the readback stays a run rule and must not
   become a wakeup on the release child.
8. **The release serializes on a prefix.** ADR-0009, the guide and the Planner query open
   `gh pr list --base main` heads, filter them to `spec/*`, and park the next release on
   `--until-issue`. With ticket-id heads there is no prefix to filter, the query was never the
   merge-safe fact, and an `--until-issue` on a cancelled dependency waits forever unless it
   reads `ended`.
9. **The human seat is chosen per epic.** The kickoff copy in `skills/grilling`, the Planner
   contract and the guide name the seat for each epic and the kickoff records it as issue state.
   The workflow binds exactly one `human` handler, so the choice is a readback of the handler; two
   epics cannot have different seats in one workflow.
10. **The vocabulary and the guide describe the old model.** The glossary still defines a prefixed
    scratch branch, an unassigned human lane, an epic that moves at the first promotion and a
    release child whose head is the integration branch; the guide repeats all four. The new
    concepts — ticket-id branches, the leased rewrite, the slice release — have no words.

## Solution

Describe what the platform does, keep the approved direction, and let the contract follow it.

- **Branches are ticket ids.** The integration branch is the epic's key; every PR head is the
  delivering ticket's key; the release branch is the release child's key. The epic's key is never
  a PR head and the epic holds no PR link. No `spec/`, `release/` or `agent/` prefix; the
  `repo checkout` branch is scratch.
- **A rewrite is leased and never required.** A rework adds a commit to the same head. A rewrite
  happens only when the commits themselves must not remain: on your own PR head, after a fetch,
  with `git push --force-with-lease=<remote-ref>:<expected-sha>`; never `--force`, `-f`,
  `--mirror`, `+`, `main` or the integration branch.
- **Every ticket has a planned owner.** The Planner is the fallback; the human lane's planned
  owner is the live human seat; no ticket is unassigned, and the spec PASS has no human-lane
  exception.
- **The epic is in progress from the kickoff.** Create it in `backlog` and move it: `epic_progress`
  means "slice under way", and the final `done` is still the Planner's acceptance.
- **The native wake is the wake.** The platform's parent stage wake replaces the
  `--until-children-done` barriers. Conflicts use `wakeup list` then `wakeup update`. The release
  readback runs in the Planner's acceptance and the cancelled sweep in the cancelling run; no
  condition's only trigger is a ticket that closes.
- **The release lane stays and the serialization goes.** The release child and its release PR are
  the pre-merge whole-slice gate. There is no `spec/*` query and no release park; a condition that
  remains reads `ended`; package release (release-please) is outside the factory.
- **One human seat per workflow.** The workflow's `human` handler is the seat; the kickoff records
  it on the epic as a readback, not a per-epic choice.
- **The record and the vocabulary.** Seven ADRs carry the decisions, the glossary gains or changes
  `integration branch`, `release branch`, `slice release`, `planned owner`, `epic_progress` and
  `rewrite/lease`, and stage 2 updates the guide from the same rules.
- **The live text links every ticket.** The link rule covers the PR body, the proposed breakdown
  and the spec comments; a bare ticket key there is a Standards finding and blocks the PASS. The
  catalog's own Markdown stays anonymous and carries bare keys, never a workspace URL.

## User Stories

1. As the approval owner, I want a delivering ticket's key on its PR head, so that a merge completes only the ticket that carries the work.
2. As the approval owner, I want the epic's key never to be a PR head, so that a release cannot complete the epic.
3. As the approval owner, I want the epic to hold no PR link, so that only a delivering ticket's merge advances work.
4. As the approval owner, I want the ticket-id name to be the only branch name, so that a prefixed head cannot regress the topology.
5. As the approval owner, I want `repo checkout` to be scratch, so that no handoff depends on it.
6. As the approval owner, I want a rework to add a commit, so that the reviewed history survives an ordinary correction.
7. As the approval owner, I want a rewrite allowed only when the commits themselves must not remain, so that it is a decision, not a default.
8. As the approval owner, I want the rewrite pinned to an expected sha after a fetch, so that a rewrite cannot silently replace another author's head.
9. As the approval owner, I want the lease to be the only guard, so that `--force`, `-f`, `--mirror`, `+`, `main` and the integration branch have no exception.
10. As the Planner, I want every created ticket to carry its planned owner, so that no ticket waits ownerless.
11. As the Planner, I want the human lane's planned owner to be the live seat, so that the lane I cannot name in the catalog is still owned.
12. As the Planner, I want no unassigned ticket and no human-lane exemption at the spec PASS, so that the published set is complete and checkable.
13. As the Planner, I want the epic created in `backlog` and moved, so that the create call starts no run.
14. As the Planner, I want `epic_progress` from the kickoff, so that a slice under way is not indistinguishable from a queued epic.
15. As the Planner, I want the epic's final `done` to stay my acceptance, so that the release evidence is read before the epic closes.
16. As the Planner, I want the platform's parent stage wake to promote the frontier, so that I do not arm a duplicate barrier per promotion.
17. As the Planner, I want no condition whose only trigger is a closing ticket, so that a release readback and a cancelled sweep are never self-defeating.
18. As the Planner, I want the release readback in my acceptance run, so that it runs after the release merge, not on the release child's closure.
19. As the Planner, I want the cancelled sweep in the run that cancels the epic, so that the cleanup cannot be disabled by the cancellation.
20. As the Reviewer, I want the conflicts rule found with `wakeup list` and replaced with `wakeup update`, so that re-arming never duplicates it.
21. As the Reviewer, I want one conflicts rule per ticket, so that the branch has one hazard watcher.
22. As the Reviewer, I want a spec PASS to read every child's planned owner, so that the human lane is checked with the rest.
23. As the Release seat, I want the release branch to be the release child's key, so that the epic is never a release head.
24. As the Release seat, I want no `spec/*` serialization query, so that the release order is the merge-safe fact and not a prefix.
25. As the Release seat, I want the Reviewer's `mergeStateStatus` read to hold the order, so that only one release is merge-ready.
26. As the Release seat, I want `ended` where a dependency condition remains, so that a cancelled dependency releases the wait instead of hanging it.
27. As the Release seat, I want the slice release to be the factory's release, so that a package publication is not mistaken for it.
28. As the human, I want one seat per workflow read from the handler, so that a kickoff cannot route my lane to a different member.
29. As a maintainer, I want the seven ADRs and the glossary terms, so that each rule has one durable home and one word.
30. As a future reader, I want this spec to record its own rule, its named exception and its expected snapshot, so that it practices the live-data rule it writes.
31. As the approval owner, I want a bare ticket key in the PR body, the proposed breakdown or a comment to fail the review, so that no reader is left with a reference they cannot follow.

## Implementation Decisions

**D1 — Branch names are ticket ids.** The integration branch is the epic's key, forked from `main`
at the spec sha and the base of the spec PR and every delivery PR. A spec PR's head is the spec
child's key, a delivery PR's head is its own ticket's key, and the release PR's head is the
release child's key forked from the integration branch at the release head. The epic's key never
heads a PR and the epic never holds a link. There is no prefix vocabulary: `spec/`, `release/`
and `agent/` names are gone from the contract, and the checkout branch is scratch. The branch is
the link, so the title carries the same key for the record, and the platform's link table is one
ticket per open head.

**D2 — A rework adds a commit; a rewrite is leased and never required.** The default is additive:
a new commit on the same head, so the PR number, link, body and reviewed history survive. A
rewrite is allowed only when the commits themselves must not remain — a secret, a wrong author, a
history that would mislead the release review — and only on your own PR head, after a fetch, with
`git push --force-with-lease=<remote-ref>:<expected-sha>`. `--force`, `-f`, `--mirror`, `+`, `main`
and the integration branch have no exception. The lease, not a review, is what stops a rewrite
from replacing a head another run pushed in between.

**D3 — Every ticket carries a planned owner.** Creation passes `--project` and the planned owner's
`--assignee`; status entry still reassigns natively, so the planned owner only has to be right
until the first move. The Planner is the fallback when the catalog cannot name the seat. The human
lane is no longer an exception: its planned owner is the live human seat, the member bound to the
workflow's `human` handler, read at create time. No ticket is unassigned, the publisher pre-flights
the whole set, and the spec PASS reads every child's owner with no lane exemption.

**D4 — The epic is in progress from the kickoff.** The epic is created in `backlog` and moved to
`epic_progress` when the kickoff starts the spec child; creating in `todo` enqueues an agent run
at create time and leaves the epic reading as queued. `epic_progress` now means "slice under way",
from the kickoff to the Planner's acceptance; the final move to `done` is still the Planner's, on
the release evidence. The status keeps no handler, so neither move dispatches a run.

**D5 — The native wake is the wake; conflicts are updated in place.** The platform wakes the
parent assignee when a stage closes while a later stage waits, and again when every child closes.
The catalog arms no `--until-children-done` condition; the promotion is the Planner's run on that
wake. A conflicts condition is one rule per ticket: `multica issue wakeup list` finds the existing
rule and `wakeup update` replaces its whole configuration; `wakeup create` is used only when no
rule exists, because it adds rather than replaces. The Reviewer still arms it at every review and
the rule survives the PASS into `awaiting_merge`.

**D6 — No condition's only trigger is a closing ticket.** The platform disables an issue's
wakeups when it is closed, cancelled or completed. A release readback registered on the release
child would never fire, and the `--until-status cancelled` sweep on the epic is disabled by the
cancellation that should have triggered it. The release readback runs in the Planner's acceptance
run, after the release merge; the cancelled sweep runs in the run that cancels the epic, as part
of that run. The live `spec_progress` instruction that still says to register the cancelled
condition is a stale sentence stage 2 removes.

**D7 — The release lane keeps the gate and loses the serialization.** The release child and its
release PR remain the pre-merge whole-slice gate: merge `main` in, resolve inside `## Touch`, run
the repository's full check, and merge as one squash. There is no `gh pr list` `spec/*` filter and
no `--until-issue` park; release order is the repository's up-to-date requirement plus the
Reviewer's `mergeStateStatus` read before the release PASS. Where a dependency condition remains —
a cross-epic wait — it reads `--until-issue-state ended`, so a cancelled dependency releases the
wait. The factory's release is the slice merge; a package release (release-please) is outside the
factory and is not a second release lane.

**D8 — One human seat per workflow.** The workflow binds exactly one `human` handler, and every
human-lane column and the `awaiting_merge` gate resolve to it. The kickoff reads that handler and
records the seat on the epic as a readback, not a choice; two epics in one workflow cannot have
different seats. A member gets the assignment; the member handler runs nothing.

**D9 — The branch and the vocabulary live once.** The head rule lives once in shared
`## Delivery`, the planned owner once in shared `## Ownership`, the seat rule once in the kickoff
copy in `skills/grilling`, the wake rules once in the Planner and Release contracts, the conflicts
rule once in `skills/code-review`, the release gate once in `roles/release.md`, the promotion table
once in `roles/planner.md`, and the guide describes all of them without restating a numbered rule.
The glossary gains or changes `integration branch`, `release branch`, `slice release`, `planned
owner`, `epic_progress` and `rewrite/lease`; no second copy is added.

**D10 — This slice is the last prefixed one; the transition is the named exception.** The
integration branch is `spec/MIR-304`, forked at `074cd90`; this spec PR's head is MIR-305's key,
the stage-2 PR's head is MIR-306's key, and the release PR is `spec/MIR-304` → `main`. The
ticket-id topology begins with the next epic: its integration branch is the epic's key, its
delivery heads are the tickets' keys and its release branch is the release child's key. The
exception is exact: one prefixed integration branch, and a release head that is the integration
branch because the live release contract still pins it and the realigned contract reaches the
workspace only after this release's own `just sync`. Every other head is already the delivering
ticket's key.

**D11 — The carriers and the tests move together.** Shared, the roles, the three skills, the
workflow file, the guide and `docs/apply.md` change in one stage-2 ticket, because they are one
contract and the tests pin their text. The caps hold by replacement, not append: shared at 340
words and every role at 130. The suite's stale pins — the `--until-children-done` sentence, the
cancelled-condition sentence and the prefixed template line — are corrected in the same change;
the checker is the same offline matrix.

**D12 — One release.** The slice lands on `main` as one squash carried by MIR-307, the final-stage
child; the spec PR's merge approves the set and starts nothing. No child is created after that
merge, and nothing here starts delivery.

**D13 — Live issue text links every ticket.** The review's first pass found the spec PR body
carrying bare ticket keys while the repository contract already requires a workspace link; the
reslice adds the read, not a new rule. The rule is one line in shared `## Ownership`: write each
issue as its workspace link, and keep a bare identifier only in a commit subject, PR title or branch
name. The places the review reads are the PR body, including the proposed breakdown table; the spec
comments; and any packet an agent posts. A bare key there is a Standards finding and blocks the
PASS. The catalog's own Markdown is the exception by construction: it is anonymous, carries no
workspace URL, and keeps bare keys, which the anonymity check governs. Stage 2 extends the existing
link read in `skills/code-review` from the title and head to the body and the ticket's comments,
names the three places in shared and the ticket template, and pins the read and the anonymity
exception in the suite.

## Testing Decisions

The seam is the existing offline matrix, not a new module: `tests/factory-workflow.test.js` pins
the workflow instructions and the guide, `tests/contracts.test.js` pins the authored shapes,
`tests/brevity.test.js` pins the caps, `tests/docs.test.js` reads the spec and ADR headers and
`tests/anonymity.test.js` keeps the catalog free of live identity. The tests assert the contract a
run renders and the guide a human reads, never the bytes of a spec or an internal helper.

- **The branch rule is pinned where it is read.** Shared `## Delivery` names the ticket-id head
  and the integration branch as the epic's key; the ticket template's `Branch:` line carries the
  integration branch and no prefix; `skills/to-tickets` and the Planner contract name the three
  branch roles. A `spec/<epic>` head, a release head on the epic or an `agent/*` head in a rule
  fails the suite.
- **The rewrite rule is pinned once.** Shared `## Delivery` names the additive rework, the
  `--force-with-lease` form, the fetch and the forbidden flags; no role, skill or column restates
  a second copy. A `--force` without the lease, or a mandated rewrite, fails the scan.
- **The ownership rule is pinned where it is read.** Shared `## Ownership` carries the planned
  owner and the human lane's live seat; the publisher in `skills/to-tickets` pre-flights every
  child; the spec PASS's set read in `skills/code-review` reads every child's owner with no
  human-lane exception. An unassigned-lane sentence, or an ownerless child in the fixture, fails
  the suite.
- **The epic state is pinned in the workflow and the guide.** The kickoff instruction, the Planner
  contract and the guide say create in `backlog`, move to `epic_progress` at the kickoff, and
  accept `done` on the release evidence; a `todo` create or a first-promotion move fails the suite.
- **The wake rules are pinned by presence and absence.** The Planner contract says the stage wake
  promotes and names no `--until-children-done`; `skills/code-review` names `wakeup list` then
  `wakeup update`; the updated guide carries the release readback in the Planner's acceptance and
  the cancelled sweep in the cancelling run; no file registers a condition whose only trigger is a
  closing ticket. The old barrier sentence, the old create-replaces sentence and the
  `--until-status cancelled` registration each fail the scan.
- **The release lane is pinned.** `roles/release.md` names the release branch, the
  `mergeStateStatus` gate, `ended` and the package-release boundary; the guide and
  `docs/apply.md` carry no `gh pr list --base main` filter and no `spec/*` serialization, and the
  up-to-date requirement is named operator state whose absence is reported.
- **The seat rule is pinned once.** `skills/grilling` reads the seat from the live `human` handler
  and records it as a readback; no file presents it as a per-epic choice. The guide's kickoff
  section says the same.
- **The glossary is pinned by term.** `tests/contracts.test.js` reads the six terms and the
  corrected handoff-gate entry; a glossary without `rewrite/lease` or with the old epic-`todo`
  sentence fails.
- **The live-text link rule is pinned where it is read.** Shared `## Ownership` carries the link
  rule and names the PR body, the proposed breakdown and the spec comments; `skills/code-review`
  reads those three places in its existing link check and fails a bare ticket key on Standards; the
  ticket template points at the rule. A bare key in the PR body, the breakdown or a comment fails
  the fixture, and a catalog file that embeds a workspace URL fails the anonymity check.
- **The caps prove replacement.** `tests/brevity.test.js` stays unchanged and green at 340 and
  130; a sentence added without a removal fails it.
- **Negative fixtures.** A shared Delivery without the head rule, a shared Ownership with an
  unassigned lane, a template with `Branch: spec/<epic-key>`, a planner with the barrier, a
  code-review with the create re-arm, a spec_progress that registers the cancelled condition, a
  release role with the `spec/*` filter, and a guide with the old epic state each fail the suite.
- **What the suite cannot prove.** The platform's link trigger and link table, the parent stage
  wake, the create-adds/update-replaces behaviour, the disabled-wakeup-on-close fact,
  `mergeStateStatus`, and the operator's repository settings are live facts. The live acceptance
  matrix below is where they are observed once.

### This spec's live data

**Rule.** Branches are ticket ids; a rework is additive and a rewrite is leased; every ticket has
a planned owner; the epic is `epic_progress` from the kickoff; the platform's parent stage wake
promotes and conflicts are updated in place; no condition's only trigger is a closing ticket; the
release lane is the whole-slice gate with no serialization; the workflow's `human` handler is the
one seat; the live text links every ticket and the review reads it.

**Named exceptions.** This slice is the last prefixed one: its integration branch is
`spec/MIR-304` and its release head is that branch, because the live release contract pins it and
deploys after this release. The transition is the exception; every other head is a ticket id. The
catalog's own Markdown is the other: it is anonymous, so it carries bare keys and no workspace URL,
and the anonymity check governs it. A live-data delta that leaves the rule, the exceptions and the
acceptance unchanged is reported and verified, not re-approved.

**Expected snapshot.** The Factory graph keeps its fifteen columns, five seats and two mode labels;
`epic_progress` has no handler; the four review columns still declare `awaiting_merge` and the
promotion table keeps its four rows. `spec/MIR-304` exists at `074cd90` and is this PR's base; no
second spec PR is open at once. MIR-305 is this child, and MIR-306 and MIR-307 exist in `backlog`
before this PR opens, MIR-307 last; every child carries its planned owner. This PR's head is `MIR-305` and it is linked to MIR-305 only. The workflow's
`human` handler is bound to one member; the repository has squash-only merges, auto-merge off and
delete-head-branches on; its `main` is expected to require an up-to-date head before merge, as
operator state whose absence the release reports. `multica issue pull-requests unlink` exists.

**Executed set.** The stage-2 and release tickets report what the run actually found and every
delta against this snapshot, with the commit SHA and the evidence; the release verifies the report
at the integrated head. A delta inside the named exceptions does not revise the spec.

## Live acceptance

The offline suite pins the contract text; the platform's link trigger, stage wake, wakeup
semantics, `mergeStateStatus` and operator settings are live facts. Run this once after the
stage-2 catalog change reaches a workspace, in a throwaway project with a repository resource and
the Factory workflow bound. Record `multica issue timeline` and the link table before closing each
item, and put the result on MIR-307, never in this repository.

| Scenario | Shape | Expected evidence |
| --- | --- | --- |
| ticket-id link | a spec child and a delivery child whose PR heads are their own keys | each PR links to its own ticket; the merge completes that ticket; the title and the head name the same key |
| bare-key review | a PR body, a proposed breakdown or a spec comment with a bare ticket key | the review reads the live text in its link check and fails it on Standards; the author links the key; no PASS stands over a bare key |
| no epic link | a spec merge and a release merge with the epic still open | the epic holds no linked PR; the release child holds its release PR; the epic's state moves only by the Planner's hand |
| native wake | a stage whose children all close while a later stage waits | one Planner run starts from the platform's parent wake and promotes the frontier; no `--until-children-done` condition exists |
| one conflicts rule | a reviewed PR revisited twice | `wakeup list` shows one conflicts rule; `wakeup update` replaces it in place; a second rule is never created |
| no unassigned | a published set with a human-lane child | every child carries a planned owner, the human lane's being the live `human` handler's member; the spec PASS finds no ownerless child |
| no serialization | two slices with a release each | no `spec/*` query runs; the second release waits on the Reviewer's `mergeStateStatus` read, with the up-to-date requirement where the repository carries it; a missing requirement is reported as an operator delta, not filled by a park |
| release readback | the release merge completes the release child | the Planner's acceptance run reads the squash on `main`, the checks and the applied catalog back; no wakeup on the release child is registered |
| cancelled sweep | an epic cancelled before its release merges | the run that cancels the epic closes its open PRs, deletes the integration branch, cancels the remaining children and records what merged and what is abandoned |

## Out of Scope

- **The catalog realignment itself.** Stage 2 lands the contract carriers, the guide,
  `docs/apply.md` and the tests; this ticket writes the spec, the ADRs and the glossary only.
- **The release.** MIR-307 owns the release PR, the `just sync` readback, the live acceptance
  matrix and the evidence the Planner accepts the epic on.
- **Platform changes.** The link trigger, link table, stage wake, wakeup semantics, statuses and
  merge completion are the platform's; the catalog uses them as they are.
- **Repository operator state.** Branch protection, the up-to-date requirement, auto-merge off and
  delete-head-branches are operator settings. The expected snapshot names the up-to-date
  requirement; the release reports the delta when the repository does not carry it.
- **Package release.** release-please and any package publication are outside the factory; the
  slice release is the merge on `main`.
- **Migrating accepted records.** ADR-0004/0008/0009/0011/0012/0013/0014/0015/0016/0017/0019/0020
  and the accepted specs are not edited; the new ADRs state the supersessions.
- **Retrofitting existing branches and epics.** A spec already accepted keeps its shape; the
  ticket-id topology applies from the next epic, and this slice's prefixed branch is the named
  exception.
- **The historical two-link tickets.** They are evidence for the one-PR rule, not work in this
  slice.
- **A new status, column, label, autopilot or wakeup.** No graph construct is added; the change is
  prose, branch names and the read that applies them.
- **A drill infrastructure.** The live acceptance matrix is exercised once on the release ticket,
  not as a standing project.

## Proposed breakdown

The spec run publishes every child but stage 1 in `backlog`, under the epic, in stage order; the
final-stage release child is created last and is the only path to `main`. Stage 2 is one ticket,
not two: the delivery rules and the lifecycle rules share one contract and the same pinning files
(`roles/planner.md`, `shared/instructions.md`, `tests/factory-workflow.test.js`,
`tests/contracts.test.js`), so two parallel PRs would collide and the epic allows the spec run to
refine the split. Stage 3 verifies stage 2 at the integrated head.

| Stage | Ticket | Assignee | Delivers |
| --- | --- | --- | --- |
| 1 | MIR-305 — Spec: platform realignment | Planner | This document, ADR-0022–0028, the six glossary terms and the spec PR into `spec/MIR-304`; its merge approves both. |
| 2 | MIR-306 — Realign the Factory contracts with the platform | Implementer | Shared, the roles, the three skills, the workflow file, the guide, `docs/apply.md`, the glossary's rule copies, the live-text link rule and its review read, and the offline pins; caps replaced. |
| 3 | MIR-307 — Release the platform-realignment spec to main | Release | The release PR as one squash, the applied catalog readback, the nine live-acceptance rows with `multica issue timeline`, the executed set against this snapshot, and the evidence the Planner accepts the epic on. |

## Further Notes

**Why the head branch becomes the link.** The platform links by a key in the title or the head, so
the catalog had two identifiers for one fact and they could disagree. Making the head the ticket's
key turns the link into a property of the branch: a wrong head cannot link a different ticket, and
the epic's key is not a head, so no release can complete the epic. The title keeps the key for the
record and for the squash subject.

**Why the force-push mandate is the wrong default.** A rework is usually a correction to a
reviewed head: the review's history is the evidence that the correction was reviewed. Deleting it
to avoid a stale commit costs the record for a reason that is not about the record. A rewrite is
for the narrow case where the commits themselves must not remain, and the lease is the guard that
makes it safe against a concurrent push.

**Why the epic moves at the kickoff.** `todo` on an agent-assigned issue starts a run, so opening
the epic there dispatches work before the user's yes. `backlog` is the only create that parks. The
kickoff then moves the epic to `epic_progress` in the same run that starts the spec child, so the
board says "slice under way" from the first moment the slice exists, and the final `done` remains
the acceptance.

**Why the release keeps its child but loses the query.** The whole-slice gate is what makes a
release reviewable as one tree; the serialization query was an attempt to keep two releases from
racing. With ticket-id heads the prefix no longer identifies a release, and the query never
prevented the race it named: the merge-safe fact is the Reviewer's `mergeStateStatus` read, with
the up-to-date requirement as the expected operator enforcement. Removing the query removes a rule
that cannot be executed; the gate stays.

**Why the wakeups had to change.** The platform disables an issue's wakeups when it closes, so a
condition whose trigger is that closure is unreachable by construction. The cancelled sweep is
that condition; the release readback is the verification the merge makes possible, and giving it a
wakeup on the release child would be the same unreachable shape. Moving each into the run that owns
the moment — the acceptance and the cancelling run — keeps the work and deletes the unreachable
rule. The conflicts condition stays a wakeup, but as one rule updated in place rather than a new
rule per review.

**Why one human seat.** The workflow binds one `human` handler; every human-lane column and the
merge gate resolve to it. A per-epic choice adds a field the routing already answers, and it can
name a member the handler does not route. The readback keeps the seat visible on the epic without
making it a decision.

**Why the live text is part of the delivery contract.** A bare ticket key in a pull request body,
a proposed breakdown or a comment is not a broken link: it is a reference the reader cannot follow,
and the platform's link table never sees it. The rule already lived in shared `## Ownership`; the
missing piece was a reader, so the review reads the three live-text places with the link check it
already runs. The catalog's own Markdown is the other side of the same rule: it is anonymous, so it
carries bare keys and never a workspace URL.

**The live delta this spec already names.** The `main` branch protection and the up-to-date
requirement are operator state, and the repository may not carry them when the release runs; the
expected snapshot states the expectation and the release reports the delta. The live
`spec_progress` instruction still says to register the cancelled condition; stage 2 removes it,
and the acceptance reads the corrected contract.

**This spec is its own last instance.** `spec/MIR-304` is forked from `main` at `074cd90` before
this PR exists, this PR targets it, and MIR-307 is the only path to `main`. The merge of this PR,
the stage-2 merge and the release are the last run of the prefixed topology; the ticket-id
topology starts with the next epic.

**Reversibility.** Nothing here is a platform feature: the branch names, the rewrite default, the
planned owner, the epic state, the wake rules, the release order and the seat are prose and reads
the seats apply. A later spec that wants a different topology needs a new ADR and a new spec, which
is the point of the record.
