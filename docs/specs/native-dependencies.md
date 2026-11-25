# Native dependencies

`integration: MIR-312` — forked from `main` at the spec sha before this pull request exists.

Accepted 2026-11-25. Approval is the merge of this pull request into `MIR-312`, which completes
MIR-313 and approves the published set: MIR-325 in stage 2 and the release child MIR-326 in
stage 3, both `backlog` before the merge. MIR-312 is the epic: `epic_progress` from the kickoff,
and the Planner accepts it on evidence after the release lands. ADR-0029 records the blocker
model, ADR-0030 the platform floor and ADR-0031 the sweep retirement. They supersede the
`--until-issue` clauses of ADR-0019 and ADR-0027, ADR-0001's "any Multica account", and ADR-0012
with ADR-0026's stale-sweep clause, and leave every other decision standing. The six-row drill
was observed on the platform before this pull request opened; its record is in the pull request
body.

## Problem Statement

The platform's 0.13.0 release gives issues native dependencies. A blocker holds a ticket's run
back and releases on `done` or `cancelled`; a system wake starts the waiting assignee when the
last blocker ends; a stage barrier already arrives as blockers on every later-stage child. The
catalog still carries the hand-rolled model, and each carrier contradicts what the platform now
does:

1. **A dependency wait parks the ticket in `blocked`.** The workflow's `blocked` instruction and
   the guide's blocked and dependency rows say a cross-epic wait is an `--until-issue` condition
   that keeps the ticket in `blocked` until the dependency closes. The platform holds the run and
   starts it when the blocker ends; parking it in `blocked` makes the Planner triage a wait the
   platform already owns.
2. **The dependency is a body list.** `skills/to-tickets` and `roles/planner.md` let a dependency
   live as a list in a body and put it on whatever ticket the planner remembers, including the
   spec child or the release child. The edge is a relation the platform acts on, and the epic is
   the group whose `done` lands after its release merge.
3. **The wait is not build-ready.** Nothing says the woken run first checks that the dependency's
   release squash is on `main` and merges it in. A dependency is a tree, not a status: without the
   sync the dependent work starts on a base that predates the dependency.
4. **The stage wait is restated by hand.** The guide's stage-barrier paragraph and the slicing
   rules say later stages wait, but nothing says the platform materialises that wait as a blocker
   and nothing forbids a manual intra-epic edge; the catalog invites a duplicate relation for a
   wait that already exists.
5. **`--until-issue` keeps a job.** The release contract and the guide still name it, with the
   `ended` clause added for a cancelled dependency. Its remaining job was the cross-slice wait,
   which the platform's dependency wake replaces; the release order's real carrier is the
   repository's up-to-date requirement plus the Reviewer's `mergeStateStatus` read.
6. **No platform floor.** The catalog claims it applies unchanged to any account, and
   `just sync` writes into a workspace whatever version the CLI and runtime happen to be. The
   native blocker and the sweep retirement are 0.13.0 behaviour; on an older platform the model
   is silently absent, and the sweep's removal leaves nothing behind.
7. **The stale sweep survives its reason.** An hourly autopilot dates every reviewer-handled
   ticket and moves it to `blocked` past two hours. It burns a run every hour in every workspace,
   it turns a stalled review — a defect in the handling run — into Planner triage, and its
   carvers span the catalog, the prompt, the guide, the README, the glossary and the suite.
8. **The vocabulary and the guide describe the old model.** There is no word for a blocker, a
   stage wait or a platform floor; `blocked` is not defined as triage only; the sweep is a
   glossary term even though it is going.

## Solution

Describe what the platform does, keep the approved direction, and let the contract follow it.

- **A blocker is the only carrier for a wait on another issue.** A dependency wait never enters
  `blocked`: the ticket stays in its lane, or in `backlog` until promoted, and the platform starts
  its assignee when the last blocker ends. `blocked` is triage only — missing information or an
  external condition.
- **A cross-slice dependency names the other slice's epic.** Every delivery child of the dependent
  slice whose work needs it carries the blocker, set at publish; the spec child and the release
  child never do, and neither does the epic. A dependency on a slice that is not yet filed is
  filed first.
- **The wait is build-ready.** The woken run verifies the dependency's release squash is on
  `main`, then syncs the base: fetch, ancestor check, merge `main` into the integration branch,
  resolve inside `## Touch`, retry once on a rejected push. A `cancelled` dependency is not a
  delivered one: the run records it and parks the ticket in `blocked` for the Planner.
- **Inside an epic the stage wait is the blocker.** The platform materialises the stage barrier on
  every later-stage child; the guide states it and adds no manual intra-epic edge. A same-stage
  dependency is a slicing defect: distinct stages, never a relation.
- **`--until-issue` retires.** Its remaining job was the cross-slice wait, the platform's
  dependency wake replaces it, and the release contract loses the `ended` clause it carried for
  it. What remains is the up-to-date requirement and the Reviewer's `mergeStateStatus` read.
- **The catalog declares its platform floor.** Multica 0.13.0 or newer, declared once and refused
  at the resolver before any write — `--dry-run` included — against both the syncing CLI and the
  bound runtime's `metadata.cli_version`. This supersedes ADR-0001's "any Multica account".
- **The stale sweep retires.** Its carriers, its guide section, its README row, its glossary entry
  and its test pins go; ADR-0012 and ADR-0026's clause are superseded, and the `blocked` entry is
  re-read without its second user.
- **The drill is the spec run's.** The rules are observed on the platform before the prose freezes
  — a throwaway project, the fixture repository and a copy of the Factory workflow, the new rules
  applied by hand. A finding that changes a rule is an in-window spec change, not a new epic.

## User Stories

1. As the approval owner, I want a wait on another issue to be a blocker, so that the platform releases it without a status move.
2. As the approval owner, I want a dependency wait never to enter `blocked`, so that the Planner is not asked to triage a wait the platform owns.
3. As the approval owner, I want `blocked` to mean triage only, so that a genuine missing input is distinguishable from a scheduled wait.
4. As the approval owner, I want a promoted ticket with an open blocker to start nothing, so that a dependency cannot be outrun by a promotion.
5. As the approval owner, I want the platform to start the waiting assignee when the last blocker ends, so that no one has to notice and dispatch it.
6. As the Planner, I want a cross-slice dependency to name the other slice's epic, so that the group whose release lands on `main` is the thing waited on.
7. As the Planner, I want the blocker on every delivery child that needs it and on no other child, so that the spec and release lanes are not gated by a tree they do not consume.
8. As the Planner, I want the edge set at publish, so that the set the merge approves is the set that waits.
9. As the Planner, I want a dependency on a slice not yet filed to be filed first, so that a key that does not exist is never named.
10. As the Implementer, I want the woken run to verify the dependency's release squash on `main`, so that a `done` dependency is a delivered one.
11. As the Implementer, I want the woken run to sync the base before it works, so that the dependency's tree is in my base.
12. As the Implementer, I want the sync to be fetch, ancestor check, merge, resolve inside `## Touch`, retry once, so that a rejected push has one bounded retry and no wider rewrite.
13. As the Implementer, I want a `cancelled` dependency to park the ticket in `blocked` with the finding, so that the Planner decides what replaces it.
14. As the Implementer, I want the catalog to say a cancelled blocker is not a delivered one, so that I do not implement on a base that never arrived.
15. As the Planner, I want the stage wait stated as the platform's blocker with `via: stage`, so that I do not add a manual edge for a wait that already exists.
16. As the Planner, I want a same-stage dependency called a slicing defect, so that the fix is a distinct stage, never a relation.
17. As the Planner, I want no manual intra-epic edge, so that one wait has one carrier.
18. As the Reviewer, I want a delivery ticket's blockers read as part of the ticket, so that a relation that changed the set is visible at the exact head.
19. As the Release seat, I want `--until-issue` gone from my contract, so that I do not park a release on a condition the platform no longer needs.
20. As the Release seat, I want the `ended` clause gone with it, so that the contract does not keep a rule for a retired command.
21. As the Release seat, I want the up-to-date requirement and `mergeStateStatus` named as what remains, so that release order still has a carrier.
22. As an operator, I want the floor declared once, so that the catalog has one version fact, not one per carrier.
23. As an operator, I want a lower CLI or runtime version refused before any write, `--dry-run` included, so that a sync cannot half-apply a contract the platform cannot run.
24. As an operator, I want both the syncing CLI and the bound runtime checked, so that a matching CLI cannot dispatch runs to an older runtime.
25. As an operator, I want the refusal to name both versions, so that the upgrade is obvious.
26. As a maintainer, I want the stale sweep and every carrier of it removed, so that a stalled review is a defect in the handling run, not an hourly autopilot move.
27. As a maintainer, I want the autopilot's retirement in the migration ledger, so that a live sync retires it explicitly instead of leaving it running.
28. As a maintainer, I want ADR-0012 and ADR-0026's stale-sweep clause superseded, so that the record says which decision replaced them.
29. As a future reader, I want `blocker`, `stage wait` and `version floor` in the glossary, so that the model has words.
30. As a future reader, I want the glossary's `blocked` entry re-read as triage only, so that its second user is gone with the sweep.
31. As a future reader, I want the guide to describe the model once, so that no numbered rule has a second copy.
32. As a future reader, I want this spec to record its own rule, named exceptions and expected snapshot, so that acceptance is the executed set.
33. As the approval owner, I want the drill recorded before the prose freezes, so that a wrong assumption costs a drill ticket and not a live workspace.
34. As the approval owner, I want a drill finding that changes a rule to be an in-window spec change, so that the freeze protects the approved direction, not a mistake.

## Implementation Decisions

**D1 — A blocker is the only carrier for a wait on another issue.** A wait is a
`--blocked-by` relation. A promoted ticket with an open blocker starts nothing; it stays in its
lane, or in `backlog` until promoted, and the platform starts the assignee when the last blocker
ends. `blocked` is triage only: missing information or an external condition. The rule lives once
in shared `## Delivery`; the workflow's `blocked` instruction, the guide and `roles/planner.md`
act on it and do not restate it. No carrier parks a dependency in `blocked`, and no carrier
registers a condition for it.

**D2 — The dependency names an epic, on the delivery children that need it.** The edge is the
other slice's epic — the group, the integration identity and the place whose `done` lands after
the release merge — never its release child. At publish, `skills/to-tickets` sets it on every
delivery child whose work needs the dependency and on none of the spec child, the release child
or the epic. A dependency on a slice that is not yet filed is filed first; a key that does not
exist cannot be named. The edge is set at publish because the merge that approves the set is the
commitment to it, and the `Blocked by` cell of the proposed breakdown is where the review reads
it.

**D3 — The wait is build-ready.** In the woken run the first step is: verify the dependency's
release squash is on `main` at the merge the dependency completed; then fetch, run the ancestor
check of `main` against the integration branch, merge `main` into it, resolve conflicts inside
`## Touch`, and retry once on a rejected push. The integration branch is the ticket's `Branch:`
base, so the dependent work starts on the dependency's tree. A `cancelled` blocker is not a
delivered one: the run comments the finding and moves the ticket to `blocked` for the Planner to
re-plan or cancel. A deleted blocker is the same finding; the platform's wake names both.

**D4 — Inside an epic the stage wait is the platform's blocker.** The platform materialises the
stage barrier as a blocker on every later-stage child, with `via: stage`, against every
earlier-stage sibling. The guide states the model once and the slicing rules in
`roles/planner.md` and `skills/to-tickets` add no manual intra-epic edge. A same-stage dependency
is a slicing defect: the fix is distinct stages, never a relation. The drill observed that a stage
edge cannot be removed one by one — a `--remove-blocked-by` for it returns success and the edge
remains `via: stage` — and that a manual edge on the same sibling collapses the pair into one
`via: manual` relation; both facts are why the catalog forbids the manual form and leaves the
stage form to the platform.

**D5 — `--until-issue` retires.** Its remaining job was the cross-slice wait; the platform's
dependency wake replaces it. The release contract loses the clause and the `ended` clause it
carried for it. What remains in the release-order section is the repository's up-to-date
requirement and the Reviewer's `mergeStateStatus` read against `main`; behind or dirty is a FAIL.
No carrier names the retired command, and the release lane stays the whole-slice pre-merge gate.

**D6 — The catalog declares a platform floor.** The minimum is Multica 0.13.0, declared once in
the catalog and enforced at the resolver: before any plan or write, `--dry-run` included, the
resolver reads the syncing CLI's version and the bound runtime's `metadata.cli_version`, and
refuses a version below the floor, naming both. The runtime executes the runs the catalog
dispatches, so checking only the CLI would let a matching CLI hand work to an older runtime. A
version that cannot be read refuses rather than passing. `README.md` and `docs/apply.md` state the
floor and the refusal; ADR-0030 supersedes ADR-0001's "any Multica account", and the refusal table
in `docs/apply.md` gains the row.

**D7 — The stale sweep retires.** A review that stalls is a defect in the handling run; an
hourly autopilot that moves it to `blocked` burns tokens and masks the defect. The carriers go
together: the autopilot template and prompt, its `templates/default.json` entry, the guide's
section, the README layout row, the glossary entry and the test pins, with the explicit retire
event in `migrations/changelog.jsonl` that the guard requires. ADR-0012 is superseded and
ADR-0026's clause that kept the sweep standing is superseded; the cancelled-epic sweep is
untouched, because it runs in the run that cancels the epic and its trigger is not a closed
ticket. No replacement guard is added: the timeline and the Planner's improvement loop are where
a stall is read.

**D8 — The glossary and the guide.** The glossary gains `blocker`, `stage wait` and
`version floor`, re-reads `blocked` as triage only, and loses the sweep entry; the `catalog` term
stops naming the retired autopilot and the `drill` term stops describing a stale ticket. The guide
describes the model once: the blocker as the wait carrier, the dependency naming an epic, the
stage wait as the platform's, the floor and its refusal, and the release order. No second copy is
added to a role, skill or column.

**D9 — The drill is the spec run's.** Before this pull request opened, the six-row matrix below
was run on a throwaway project bound to a copy of the Factory workflow, with the new rules applied
by hand: the dependency rows, the cancelled row, the backlog row, the stage relations and the
manual-edge question. The evidence is `multica issue timeline`, `issue get`'s `blocked_by` and
`issue runs`; the record is in the pull request body, and every delta is named there. A delta that
changed a rule would have been an in-window spec change; none did.

**D10 — The carriers and the pins move together in stage 2; the release is stage 3.** One
delivery ticket carries shared, the roles, the skills, the workflow, the guide, `docs/apply.md`,
the README, the resolver floor, the sweep removal, the migration ledger and the offline pins,
because they are one contract and the tests pin their text. The release child is the only path to
`main`, the slice's whole-slice gate and the post-sync readback. Nothing here starts delivery.

## Testing Decisions

The seam is the existing offline matrix, not a new module: `tests/factory-workflow.test.js` pins
the workflow instructions and the guide, `tests/contracts.test.js` pins the authored shapes,
`tests/config.test.js` pins the resolver and the catalog, `tests/sync.test.js` pins the applied
set, `tests/docs.test.js` reads the knowledge layer and `tests/anonymity.test.js` keeps the
catalog free of live identity. The tests assert the contract a run renders and the guide a human
reads, never the bytes of a spec or an internal helper.

- **The blocker rule is pinned where it is read.** Shared `## Delivery` carries the wait carrier
  and the triage-only `blocked`; the workflow's `blocked` instruction names the blocker and no
  `--until-issue`; the guide's blocked and dependency rows say the ticket stays in its lane. A
  carrier that parks a dependency in `blocked`, or a column that registers a condition for it,
  fails the suite.
- **The dependency edge is pinned at publish.** `skills/to-tickets` sets `--blocked-by` on the
  delivery children at publish and names the epic, the spec child and the release child as the
  three places it must not sit; the Planner contract names the edge; the proposed-breakdown
  template carries the `Blocked by` cell. A dependency list in a body, or an edge on the spec or
  release child, fails the scan.
- **The build-ready wait is pinned once.** The Implementer contract carries the release-squash
  check and the fetch/ancestor/merge/resolve/retry sequence; shared Delivery or the role, not
  both; the cancelled-blocker parking is stated once. A wait that starts without the sync, or a
  cancelled blocker treated as delivered, fails.
- **The stage wait is pinned by absence.** The guide and `to-tickets` state `via: stage`; no file
  instructs a manual intra-epic edge; a same-stage dependency is named a slicing defect. A manual
  intra-epic `--blocked-by` instruction fails the suite.
- **`--until-issue` is pinned by absence.** No catalog file, guide section or role contains it;
  `roles/release.md` keeps the up-to-date requirement and `mergeStateStatus` and no `ended`
  clause. The retired command anywhere is a failure.
- **The floor is pinned at the resolver.** The catalog declares 0.13.0 once; `scripts/config.js`
  or the live resolver refuses below it before any plan or write, `--dry-run` included, against
  both the CLI and the runtime's `metadata.cli_version`, naming both; `README.md` and
  `docs/apply.md` state it. A write attempted below the floor, or a check against only one side,
  fails the fixture.
- **The sweep removal is pinned by absence.** `templates/default.json` has no `stale-sweep`,
  the template and prompt are gone, the guide has no section, the README no row, the glossary no
  entry, and the ledger carries the retire event. Any surviving carrier fails; a live sync finds
  the autopilot absent and retires it under the ledger event.
- **The glossary is pinned by term.** The new terms and the re-read `blocked` are read by the
  suite; the sweep entry's presence fails.
- **The caps prove replacement.** `tests/brevity.test.js` stays green at 340 and 130; a sentence
  added without a removal fails it.
- **Negative fixtures.** A shared contract that parks a dependency, a `to-tickets` that sets the
  edge on the spec child, an Implementer without the sync, a guide with a manual intra-epic edge,
  a release role with `--until-issue`, a resolver that writes below the floor, and a catalog with
  the sweep each fail the suite.
- **What the suite cannot prove.** The platform's dependency wake, the `via: stage` shape, the
  duplicate manual edge's collapse, the cancelled/deleted wake and the applied catalog are live
  facts. The drill below observed them once; the release reads the applied catalog back.

### This spec's live data

**Rule.** A wait on another issue is a blocker, never a status; the dependency names an epic and
sits on every delivery child that needs it, set at publish; the woken run verifies the
dependency's release squash on `main` and syncs the base before work; a cancelled blocker parks
the ticket in `blocked` for the Planner; the stage wait is the platform's blocker with `via:
stage` and no manual intra-epic edge is added; `--until-issue` retires and release order is the
up-to-date requirement plus `mergeStateStatus`; the platform floor is 0.13.0, refused at the
resolver before any write, `--dry-run` included; the stale sweep retires with every carrier.

**Named exceptions.** The drill's dependency release squash was seeded by a fixture pull request
whose title and head named the dependency epic, so the platform's PR automation completed the
epic; that is a drill artifact, and the published slice never names an epic in a head. The fixture
repository was archived when the drill began and was unarchived for it; it is re-archived when the
drill is green, and the state is operator state, not a rule. The managed checkout's git metadata
lives outside the writable workspace sandbox, so the woken drill run synced from a clone of the
same repository; the published branch state is the assertion, not the checkout. A live-data delta
that leaves the rule, the exceptions and the acceptance unchanged is reported and verified, not
re-approved.

**Expected snapshot.** The Factory graph keeps its fifteen columns, five seats and two mode
labels; `blocked` keeps the Planner handler and its triage route. The applied catalog carries no
`stale-sweep` autopilot and no `--until-issue` text; the floor is declared once at 0.13.0 and the
resolver names both versions on refusal. `MIR-312` exists at the spec sha and is this pull
request's base; no second spec pull request is open at once. MIR-313 is this child; MIR-325 and
MIR-326 exist in `backlog` before this pull request opens, MIR-326 last, and every child carries
its planned owner. This pull request's head is `MIR-313` and it is linked to MIR-313 only. The
six drill rows read: a later-stage child lists every earlier-stage sibling `via: stage`; a
promoted child with an open blocker starts nothing; the dependency epic reaching `done` starts the
waiting child's run; a `cancelled` dependency releases the wait and the run parks the child in
`blocked`; a `backlog` child starts nothing when the dependency ends; a manual intra-epic edge
duplicates the stage wait.

**Executed set.** The six-row drill was executed on 2026-11-25, on the throwaway project `Drill:
native dependencies (MIR-312)`, the `stress-fixture` repository and the copy workflow `Factory
(native-dependencies drill)`; the record, with `multica issue timeline` and every delta, is in
this pull request's body. Stage 2 and the release report their own sets against this snapshot,
with the commit SHA and the evidence; the release verifies the report at the integrated head.

## Live acceptance

The offline suite pins the contract text; the platform's dependency wake, the `via: stage` shape
and the applied catalog are live facts. The six rows were observed in the spec run and are cited
by the release; the release adds only the post-sync readback below. Record `multica issue
timeline`, `issue get`'s `blocked_by` and `issue runs` before each move, and put the result on
MIR-326, never in this repository.

| Scenario | Shape | Expected evidence | Observed in the spec run |
| --- | --- | --- | --- |
| stage blockers | a stage-2 child beside two stage-1 siblings | the later child lists every earlier-stage sibling `via: stage`; a `--remove-blocked-by` for one returns success and the edge remains | yes — two siblings listed; removal left the relation |
| promoted but blocked | a delivery child with an open `--blocked-by` epic moves to its lane | it starts nothing; `issue runs` is empty while the blocker is open | yes — `in_progress`, no run, no wake |
| epic end | the dependency epic reaches `done` | a system wake starts the waiting child's run; the run reads the release squash on `main` and syncs the base | yes — wake, squash read, `main` merged into the integration branch |
| cancelled dependency | the dependency epic is cancelled | the wait releases; the woken run records the finding and moves the child to `blocked` | yes — wake, finding comment, `blocked` |
| backlog parking | a blocked child still in `backlog` when the dependency ends | it starts nothing; it starts when promoted | yes — no run at the end; run on promotion |
| no manual intra-epic edge | a manual edge on an earlier-stage sibling | it duplicates the stage wait; the rule forbids it | yes — the pair collapses to `via: manual`; removing it restores `via: stage` |

The release adds the post-sync readback, and nothing else:

| Scenario | Shape | Expected evidence |
| --- | --- | --- |
| applied floor | `just sync` against the released catalog, with the CLI and runtime at 0.13.0 | the plan proceeds; with either below the floor it refuses before any write, `--dry-run` included, naming both versions |
| applied blocker text | the synced workflow's `blocked` column | the instruction names the blocker and contains no `--until-issue` |
| applied sweep removal | the synced catalog | no `stale-sweep` autopilot, template or prompt; the retire event is in the ledger |
| release readback | the release merge completes MIR-326 | the Planner's acceptance reads the squash on `main` and the applied catalog; no condition sits on a closing ticket |

## Out of Scope

- **The catalog realignment itself.** Stage 2 lands the carriers, the guide, `docs/apply.md`, the
  README, the resolver floor, the sweep removal and the tests; this ticket writes the spec, the
  three ADRs and the glossary only.
- **The release.** MIR-326 owns the release pull request, `just sync`, the live readback and the
  evidence the Planner accepts the epic on.
- **Platform changes.** The dependency wake, the stage blocker, the `via` field and the PR
  automation are the platform's; the catalog uses them as they are.
- **A replacement stale guard.** No autopilot, timer or condition is added; a stalled review is a
  defect in the handling run.
- **Migrating accepted records.** ADR-0001, ADR-0012, ADR-0019, ADR-0026 and ADR-0027 and the
  accepted specs are not edited; the new ADRs state the supersessions.
- **Retrofitting open epics.** An epic already frozen runs to its release; a dependency it already
  records keeps its shape, and the new model applies from the next epic.
- **A standing drill project.** The drill project, workflow copy and fixtures are archived when
  green; the live acceptance is not a permanent project.
- **A new status, column, label or autopilot.** No graph construct is added; the change is prose,
  a resolver refusal and the removal of a retired autopilot.

## Proposed breakdown

The spec run publishes every child but stage 1 in `backlog`, under the epic, in stage order; the
final-stage release child is created last and is the only path to `main`. Stage 2 is one ticket,
not two: the blocker model, the floor and the sweep share one contract and the same pinning files,
so two parallel pull requests would collide. This slice has no cross-slice dependency; the
`Blocked by` cell is the column the spec's format must carry for slices that do.

| Stage | Ticket | Assignee | Blocked by | Delivers |
| --- | --- | --- | --- | --- |
| 1 | MIR-313 — Spec: native dependencies | Planner | — | This document, ADR-0029–0031, the glossary terms and the spec pull request into `MIR-312`; its merge approves both. |
| 2 | MIR-325 — Realign the dependency contract | Implementer | — | Shared, the roles, the skills, the workflow, the guide, `docs/apply.md`, the README, the resolver floor, the sweep removal, the migration ledger and the offline pins; the word caps replaced. |
| 3 | MIR-326 — Release the native-dependencies spec to `main` | Release | — | The release pull request as one squash, `just sync`, the applied-catalog readback, the executed set against this snapshot, and the evidence the Planner accepts the epic on. |

## Further Notes

**Why the blocker replaces the status.** A status is a place a ticket sits and a handler's
trigger; a wait is a relation to another ticket. Parking a wait in `blocked` hands it to the
Planner, who then has to notice the dependency ended and move it back — the platform now does
exactly that notice. The drill confirmed the shape: a promoted child with an open blocker runs
nothing, and a system wake starts it when the blocker ends. The status keeps the job it is good
at: a ticket that cannot be worked because an input is missing, or because the condition is
external, is a real triage item.

**Why the dependency names the epic.** The release child is only where the dependency's `main`
-scoped result first appears; the epic is the group, the integration identity and the place whose
`done` lands after the merge. Blocking a delivery child on a release child would wait on a ticket
whose merge is the dependency's own gate, which is a weaker and shorter-lived fact. The epic is the
thing whose completion means the dependency is delivered.

**Why the wait is build-ready.** A dependency is a tree before it is a status. A run that starts on
a base older than the dependency's release squash has the wrong imports, the wrong tests and, on a
conflict, no way to resolve inside `## Touch` because the base never met it. The sync is the first
step for the same reason the release merges `main` before its review: the tree under review is
the integrated one.

**Why the floor is a refusal and not a warning.** The catalog removes the sweep and stops
registering a hand-rolled wait; on an older platform the first is a live autopilot nobody meant to
keep and the second is a ticket that waits forever. A warning would let the sync write a half
contract. The refusal happens before any plan or write, `--dry-run` included, so the operator
learns the requirement without a partial apply; checking both the CLI and the runtime closes the
skew where a new CLI dispatches to an old runtime.

**Why the sweep retires now.** The sweep existed because the catalog could not see a stalled
review. The improvement loop and the timeline read it now, and the platform's own dependency
wake removes the class of wait the sweep most often triaged. The cost is one run per hour per
workspace and a `blocked` move that looks like a dependency wait — the second user the re-read
`blocked` entry drops.

**Why the drill's deltas did not change a rule.** The fixture repository was archived and the
woken run cloned the repository to get a writable git directory; neither changes what the catalog
says. The seeded release squash completed the dependency epic through the platform's PR link,
which is the expected release semantics and a reminder that the published slice never names an
epic in a head.

**Reversibility.** Nothing here is a platform feature: the blocker model, the edge's place, the
sync sequence, the floor and the sweep removal are prose, a resolver refusal and a deletion. A
later spec that wants a different wait needs a new ADR and a new spec, which is the point of the
record.
