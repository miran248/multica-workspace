# Slice freeze and one-PR links

`integration: spec/MIR-289` — forked from `main` at `00e1398`. The spec itself is delivered
under this topology, so the record is what a rework and a later reader check against.

Accepted 2026-11-21. Approval is the merge of this spec's pull request into `spec/MIR-289`,
which completes MIR-290 and approves the published set; MIR-289 is the epic — it stays `todo`
until the spec merge, `epic_progress` until the release lands, and the Planner accepts it on
evidence. The boundary is the grilling's answer. ADR-0019 records the reslice window and the
freeze, ADR-0020 the one-ticket link and the unlink correction, and ADR-0021 the live-data rule.
They supersede no earlier decision: they close edges ADR-0007 and ADR-0008 left implicit, and
ADR-0020 corrects their stale no-CLI-unlink consequence without editing them.

## Problem Statement

**A slice has no boundary after approval.** MIR-279 is the instance. Its spec merged, the cleanup
list drifted, and the ticket opened a delivery pull request and then a second spec pull request
into `spec/MIR-277`. Two open pull requests on one ticket left the epic parked at `awaiting_merge`
with the cleanup unrun. The approved set had no moment at which it became fixed: the merge
approved a list, and nothing said when amending that list stops being a revision and becomes new
work.

**The link is not one-to-one.** Four tickets updated since 19 November show two linked pull
requests; three are defects — a cross-link, a post-merge revision, and a repurposed spike ticket
— and one is the release lane's legitimate rework. The platform links a PR to the issue whose key
appears in its title or head branch, or after a closing keyword in its body, so a spec PR
branched with the epic's key completes the epic, and a second PR for the same ticket leaves two
live handoffs. The guide still says there is no CLI unlink, so a stale link waits for a human
page visit.

**Live state is written as acceptance.** A spec that records a count or a list of names as its
acceptance is true on the day it is written and may be false on the day it is executed. The
choice is then between a spec that lies and a spec revision for every delta; neither is a
policy.

**The terms are missing.** The catalog has no words for the window a change may still be made in
place, the moment the window closes, the PR that carries a post-merge change while the slice is
idle, the criterion an old epic no longer owns, or the difference between what the spec expected
and what the run found. A rule that cannot be named cannot be read or tested.

## Solution

Name the boundary, the link and the evidence, and keep the graph unchanged.

- **The reslice window is explicit.** While the spec PR is unmerged, or after its approval merge
  while no child has started, a change is made in place: amend the open PR at the same head and
  number, or open one revision PR on the same spec child; rewrite the child set and bodies;
  return to `spec_review` for a fresh PASS. No second spec PR is open at once.
- **The slice freezes at the first started child.** Once the spec has merged and any child has
  entered a started status — anything but `backlog`, `todo`, `done`, `cancelled` — the approved
  slice is frozen for the rest of its life. A real change is a new epic: the old epic runs to its
  release, the new epic owns the change, and the affected acceptance criterion is recorded as
  superseded and cited in the old epic's acceptance.
- **One open PR links to one delivering ticket.** The delivering ticket is the one whose key the
  PR carries: the spec child for the spec PR, the ticket itself for a delivery PR, the release
  child for the release PR. The epic is never linked. A ticket with more than one open linked PR
  is a blocking finding in `skills/code-review/`.
- **Stale links are unlinked with the CLI.** `multica issue pull-requests unlink` exists; the
  guide's "There is no CLI unlink" is stale and is corrected.
- **The spec records the rule, the exceptions and the expected snapshot.** Acceptance is the
  executed set at execution: the delivering ticket reports what it actually found, every delta,
  the SHA and the evidence; the release verifies the report.
- **The terms are recorded once.** The glossary gains reslice window, frozen slice, revision PR,
  superseded, expected snapshot and executed set; ADR-0019–0021 carry the three decisions.

## User Stories

1. As the approval owner, I want the reslice window to end at the first started child, so that an approved set cannot change under a running slice.
2. As the approval owner, I want a change inside the window made in place, so that no second pull request competes with the open one.
3. As the approval owner, I want a revision PR on the same spec child after the merge while the slice is idle, so that an approved-but-unstarted spec can still change without a new epic.
4. As the approval owner, I want every reslice to return to `spec_review`, so that the change gets a fresh PASS at its exact head.
5. As the approval owner, I want a rework to force-push the same head branch, so that the PR link, number and body survive.
6. As the approval owner, I want the child set rewritten in place, so that a revision leaves one set rather than a duplicate.
7. As the approval owner, I want the freeze to be a latch, so that a slice runs to its release once it has started.
8. As the approval owner, I want a real change after the freeze to be a new epic, so that the old slice's approval stands.
9. As the approval owner, I want the affected acceptance recorded as superseded and cited, so that the old epic closes honestly.
10. As the approval owner, I want the epic never to hold a pull request link, so that only the delivering ticket's merge completes work.
11. As the approval owner, I want no ticket to carry two open linked PRs, so that one ticket has one live handoff.
12. As the approval owner, I want a second open link to be a blocking finding, so that two offers cannot both be live.
13. As the approval owner, I want a closed link removed with the CLI, so that the link table stays one-to-one without a page visit.
14. As the Planner, I want the started statuses named, so that the freeze is a read, not a judgement.
15. As the Planner, I want the revision route to reopen the same spec child at `spec_progress`, so that the revision has a work lane and a fresh PASS.
16. As the Planner, I want the children reconciled before the fresh PASS, so that the approval covers the revised set.
17. As the Planner, I want no child created after the merge that approves its set, so that every child the barrier promotes was in the approved set.
18. As the Planner, I want no new status, column or label for the freeze, so that the graph and its handlers stay as they are.
19. As the Planner, I want the new epic to own a post-freeze change, so that the old slice is not re-sliced around its release.
20. As the Reviewer, I want the ticket's linked pull requests read before the verdict, so that a second open PR is caught at the review, not after two offers are live.
21. As the Reviewer, I want a spec PR linked only to the spec child, so that a spec merge cannot complete the epic.
22. As the Reviewer, I want a revision PR reviewed at `spec_review`, so that its merge re-approves the revised spec and set.
23. As the Reviewer, I want the link invariant in the review contract I already read, so that the finding is automatic.
24. As the Implementer, I want the executed set and every delta reported with the SHA and evidence, so that live drift is visible instead of hidden.
25. As the Implementer, I want a non-semantic delta to be a report, so that delivery does not stall on a spec revision it does not need.
26. As the Release seat, I want to verify the executed set against the expected snapshot, so that the release closes on evidence at the integrated head.
27. As the Release seat, I want a delta that changes the rule to take the reslice or new-epic route, so that the release is never a scope decision.
28. As a maintainer, I want the expected snapshot declared as an expectation, so that the spec does not rot and the evidence stays current.
29. As a maintainer, I want the new terms in one glossary, so that every seat reads the same words.
30. As a maintainer, I want ADR-0019–0021, so that the three decisions are durable and reversible with evidence.
31. As a maintainer, I want the guide's stale no-unlink line corrected, so that an operator uses the command that exists.
32. As a maintainer, I want the offline matrix to pin the new contract and its absences, so that deleting a rule fails the suite.
33. As a maintainer, I want the five live-acceptance scenarios, so that the platform facts are observed once, on the release ticket.
34. As a future reader, I want this spec to record its own rule, exceptions and expected snapshot, so that it practices the live-data rule it writes.

## Implementation Decisions

**D1 — The reslice window has two edges and one shape.** The window is open while the spec PR is
unmerged, and it stays open after the approval merge while no child has started. Inside it a
change is made in place. On an unmerged spec PR the Planner force-pushes the same head branch,
and the PR's number, link and body survive (ADR-0008). After an approval merge the Planner
reopens the same spec child at `spec_progress` and opens one revision PR against `spec/<epic>`;
there was no open PR to amend, and opening a second epic for a slice that has not started is the
ceremony the window exists to avoid. Both ends return the child to `spec_review` for a fresh
PASS; the old PASS is void because the head moved.

**D2 — The freeze is a latch, not a status.** The window closes when the spec has merged and any
child is in a started status: anything but `backlog`, `todo`, `done` or `cancelled`. Once the
condition has held it stays held for the rest of the slice's life. `done` is not a started
status, but a done child cannot exist without the freeze having started, so the latch keeps a
delivered slice frozen. A child parked in `blocked` counts as started: it was promoted and the
set was committed to execution. The freeze needs no new column, label or platform event; the
Planner reads the epic's children when a change arrives and the Reviewer sees the set at the spec
PASS.

**D3 — A frozen slice ends; a new epic owns the change.** The old epic runs to its release and is
not cancelled, reopened or amended. The new epic starts at the ordinary kickoff with its own spec
child, labels and branch. The affected acceptance criterion of the old epic is recorded as
superseded and cites the new epic's key, so the old epic can close on the criteria it kept. A
dependency between the two epics is an `--until-issue` condition on the dependent ticket, never a
list in a body.

**D4 — The child set is rewritten in place, never duplicated.** A reslice lists the epic's
children first, creates only the missing ones, edits the rest and cancels the dropped, so one
epic has one set. Every child exists before the revised PR is reviewed. This resolves the older
"no child once the spec PR opens" wording to "no child after the merge that approves its set": a
revision PR is the approval artifact for the revised set, so the set must exist when that PR is
reviewed; the first approval still precedes delivery, and a revision merges only after the set it
approves exists.

**D5 — One open PR links to one delivering ticket.** The rule lives once in shared
`## Delivery`: one open pull request per ticket, linked to the ticket whose key it delivers. The
existing delivery check in `skills/code-review/` reads it before the verdict — the ticket's
linked pull requests, their open count and their keys — and a second open link, or a PR linked to
a ticket it does not deliver, is a blocking finding on the Standards axis. The spec PR's link to
the spec child is the same rule, not an exception; the epic never holds a link.

**D6 — A closed linked PR is unlinked with the CLI.** `multica issue pull-requests unlink`
exists, so the stale consequence of ADR-0005 and ADR-0008 is corrected by ADR-0020 and the
guide's close paragraph names the command. The actor who closes the PR owns the unlink before a
replacement is linked. A close remains not a workflow event: no status moves and no wake fires on
it.

**D7 — The spec records the rule, the named exceptions and the expected snapshot.** The rule is
the policy; the exceptions are the approved deviations, each named with its scope; the expected
snapshot is the live state acceptance should find, declared as an expectation and never as a
claim that live state is current at read time. This spec's own three are in Testing Decisions:
its rule is the boundary and the link, its named exceptions are the reslice window itself and a
non-semantic delta, and its expected snapshot lists the graph, the CLI and the published set.

**D8 — Acceptance is the executed set.** The delivering ticket reports the set it actually
observed and every delta from the expected snapshot, each with the commit SHA and the evidence;
the release verifies the report at the integrated head. The verdict is a statement about the run,
not a restatement of the spec. No live identifier enters the catalog: the expected snapshot names
shapes and expectations, and the evidence stays on the ticket.

**D9 — A delta is a report when it does not change the rule.** A delta that leaves the rule, the
named exceptions and the acceptance unchanged is reported and verified; it does not revise the
spec, does not start a new epic and does not reopen the approval. A delta that changes any of them
is a change, and follows D1 and D2: a revision inside the window, a new epic after the freeze.
A report that hides a semantic change is a review finding, because the review reads the delta
against the rule.

**D10 — The vocabulary and the ADRs.** ADR-0019 records the reslice window and the freeze latch;
ADR-0020 the one-ticket link, the blocking finding and the unlink correction; ADR-0021 the
rule/exception/snapshot and the executed set. The glossary gains the six named terms and
`started child`, and its handoff-gate entry no longer says the slice freezes when the spec PR
opens. That false sentence still lives in the one prose copy in `skills/grilling` and is pinned
by `tests/contracts.test.js`; stage 2 corrects the skill and the pin, because stage 1's `Touch:`
does not reach them. ADR-0007, ADR-0008 and the accepted specs are not edited.

**D11 — One carrier each; the caps are replaced.** The window, the freeze and the reconciliation
live in the `spec_progress` step instruction and the Planner contract; the link invariant lives
once in shared `## Delivery` and is read by the code-review check; the guide describes both; the
live-data rule lives in the schema of the spec and in the guide's acceptance prose. Shared is
full at 340 words and the Planner at 130, so stage 2 replaces words rather than appending; the
brevity suite is the check. No new status, column, label, autopilot or wakeup.

**D12 — One release.** `spec/MIR-289` → `main` as one squash, carried by the final-stage release
child. The spec, the three ADRs and the glossary terms land with this PR; the release re-verifies
them at the integrated head.

## Testing Decisions

The seam is the existing offline matrix, not a new module: `tests/factory-workflow.test.js` pins
the workflow instructions and the guide, `tests/contracts.test.js` pins the authored shapes,
`tests/brevity.test.js` pins the caps and `tests/docs.test.js` reads the spec and ADR headers.
The tests assert external behaviour — the contract a run renders and the guide a human reads —
never the bytes of a spec or an internal helper.

- **The spec lane is pinned in the matrix.** The `spec_progress` instruction and the Planner
  contract must name the reslice window, the revision PR, the fresh PASS, the force-push, the
  freeze latch, the new-epic consequence and the superseded citation; the `spec_review`
  instruction must fail a second open spec PR or a post-freeze revision. A main-only spec run, a
  second spec PR and a post-freeze amendment each fail the suite.
- **The link invariant is pinned where it is read.** shared `## Delivery` states one open PR per
  delivering ticket; `skills/code-review/` reads the ticket's linked pull requests before the
  verdict and calls a second open link a blocking finding; the guide's close paragraph names
  `multica issue pull-requests unlink` and the stale "There is no CLI unlink" sentence is absent.
- **The guide and the Planner are pinned together.** The guide names the window, the freeze, the
  revision route, the superseded record, the rule/exception/snapshot and the executed-set report;
  the Planner contract names the route and the promotion boundary. A guide that still says the
  slice freezes when the spec PR opens fails the suite.
- **The grilling gate is corrected where it is pinned.** `skills/grilling/SKILL.md` no longer
  says the slice freezes when the spec PR opens; its sentence hands the change window to the
  reslice window and a later addition to the new epic. `tests/contracts.test.js` asserts the
  corrected sentence and the absence of the old one. The skill is in stage 2's `Touch:`.
- **The record is pinned by shape.** `tests/docs.test.js` keeps every ADR numbered, sectioned and
  one decision long, and every spec accepted; the new ADRs and the spec pass unchanged. The
  glossary's new terms and the corrected handoff-gate sentence are read by the contract test.
- **Absence is pinned.** The window, the freeze and the link rule appear once each in their
  carrier; no role, skill or column instruction restates them; the stale no-unlink line and the
  old "freezes when the spec PR opens" sentence fail a scan, including in `skills/grilling`.
- **Negative fixtures.** A shared Delivery without the one-open-PR rule, a code-review without
  the link read, a spec_progress without the window or the freeze, a spec_review that passes two
  open links, a guide with the stale unlink line, a grilling skill with the old freeze sentence,
  and a glossary with the old freeze sentence each fail the suite.
- **The caps prove replacement.** `tests/brevity.test.js` stays unchanged and green at 340 and
  130; a sentence added without a removal fails it.
- **Prior art.** `tests/contracts.test.js` (authored shapes), `tests/factory-workflow.test.js`
  (routes, the spec-run matrix and the guide), `tests/brevity.test.js` (caps), `tests/docs.test.js`
  (specs and ADRs), `tests/skills.test.js` (bindings).
- **What the suite cannot prove.** The platform's link trigger, its link table, the stage
  barrier's re-evaluation and the merge that completes a reopened spec child are live facts, not
  catalog facts. The live acceptance matrix below is where they are observed; this PR's own link
  to MIR-290 is the first observation of the spec-child rule.

### This spec's live data

**Rule.** A change is made in place only inside the reslice window; after the first started child
the slice is frozen and a real change is a new epic. A PR links to one delivering ticket, and no
ticket carries two open linked PRs. Acceptance is the executed set reported with SHA and
evidence and verified by the release.

**Named exceptions.** The reslice window is the one named exception to the freeze: a change in it
is a revision, not a new epic. A live-data delta that leaves the rule, the exceptions and the
acceptance unchanged is the one named exception to "re-spec on drift": it is reported, not
re-approved.

**Expected snapshot.** The Factory graph keeps its fifteen columns, five role seats and two mode
labels; the four review columns still declare `awaiting_merge`; the promotion table still has its
four rows. `spec/MIR-289` exists, forked from `main` at `00e1398`, is this PR's base, and at
promotion time no other `spec/*` release is open against `main`.
`multica issue pull-requests unlink` exists, and `docs/factory.md` no longer claims it does not;
`skills/grilling` no longer says the slice freezes when the spec PR opens.
The slice is MIR-290 and the two published children MIR-291 and MIR-292; all three exist before
this PR opens, MIR-291 and MIR-292 in `backlog`, and MIR-290 moves to `spec_review` last.

**Executed set.** Stage 2 and the release report what the run actually found and every delta
against this snapshot, with the SHA and the evidence; the release verifies the report. No spec
revision is opened for a delta inside the named exceptions.

## Live acceptance

The offline suite pins the contract text; the platform's link trigger, link table, barrier and
merge behaviour are live facts. Run this once after the stage 2 catalog change reaches a
workspace, in a throwaway project with a repository resource and the Factory workflow bound.
Record `multica issue timeline` and the link table before closing each item, and put the result
on the release ticket, never in this repository.

| Scenario | Shape | Expected evidence |
| --- | --- | --- |
| pre-merge reslice | the direction changes while the spec PR is open and no child has started | the Planner force-pushes the same head; the PR number, link and body survive; the child set is reconciled with no duplicate; the child returns to `spec_review` for a fresh PASS; no second spec PR exists |
| merged+idle revision | the spec PR merged while every delivery child is still `backlog` or `todo`, and a change arrives before promotion starts a child | the same spec child is reopened at `spec_progress`; one revision PR targets `spec/<epic>`; the revised set is reconciled in place; its fresh PASS and merge re-approve the set; the Planner promotes the revised frontier once; no second epic |
| merged+running new epic | a child is in a started status when the change arrives | the old epic is not amended; a new epic is created with its own spec child, labels and branch; the old epic runs to its release; the affected criterion is recorded superseded with the new epic's key on the old epic |
| two-PR FAIL | a ticket carries two open linked PRs, or a spec PR is linked to the epic | the review reads the ticket's linked PRs before the verdict and fails with a blocking finding; the ticket returns to its back status; the second PR is closed and unlinked with `multica issue pull-requests unlink`; no PASS stands |
| live-data delta without a spec revision | the run finds live state different from the expected snapshot while the rule and the acceptance are unchanged | the delivery ticket reports the executed set and the delta with the SHA and evidence; the release verifies the report; the spec is not revised and no new epic is opened |

## Out of Scope

- **Platform changes.** The link trigger, link table, statuses, wakeup conditions, stage barrier
  and merge completion are the platform's; this slice uses them as they are.
- **A new status, column, label, autopilot or wakeup.** The freeze is policy the seats read, not
  a gate the platform enforces; no detector or sweep is added.
- **Repairing the four historical two-link tickets.** They are evidence for the rule, not work in
  this slice; a link is unlinked by the actor who owns the ticket, under the new rule.
- **Editing accepted records.** ADR-0005, ADR-0007, ADR-0008 and the accepted specs are not
  edited; ADR-0020 states the correction and the guide carries the command.
- **Reworking the mode mapping, the release lane or the integration topology.** Only the
  boundary, the link and the evidence change.
- **Production promotion.** The release procedure and the deploy-time `production:` approval in
  `roles/release.md` are unchanged.
- **A migration of existing specs.** A spec already accepted keeps its shape; the rule applies to
  this spec and the specs after it.
- **A live acceptance drill beyond the release's own run.** The matrix is exercised once on the
  release ticket; it is not a standing autopilot.

## Proposed breakdown

The spec run publishes every child but stage 1 in `backlog`, under the epic, in stage order; the
final-stage release child is created last and is the only path to `main`. Stage 1 is this
ticket, whose spec PR carries this breakdown. Stages 2 and 3 are serial because the release
verifies the contract stage 2 lands. Stage 1 owns the spec, ADR-0019–0021 and the new glossary
terms; stage 2 owns the contract carriers — the grilling skill, the workflow instruction, the
Planner contract, shared, the code-review check and the guide — and the tests, and may amend
existing glossary entries but never the ADRs; the release's `Touch:` is the union.

| Stage | Ticket | Assignee | Delivers |
| --- | --- | --- | --- |
| 1 | MIR-290 — Spec: slice freeze and one-PR links | Planner | This document, ADR-0019–0021, the glossary terms (including the corrected handoff-gate entry), the published set and the spec PR into `spec/MIR-289`; its merge approves both. |
| 2 | MIR-291 — Record the reslice window, freeze and PR links | Implementer | The `spec_progress` and `spec_review` instructions, the Planner contract, the guide, the grilling skill's corrected sentence and its pin, the shared one-open-PR rule, the code-review link finding and unlink correction, the live-data wording, and the offline pins; caps replaced. |
| 3 | MIR-292 — Release spec/MIR-289 to main | Release | The release PR as one squash, the applied catalog readback, the five live-acceptance rows with `multica issue timeline`, the executed set against the expected snapshot, and the evidence the Planner accepts the epic on. |

## Further Notes

**Why the window closes at the first started child.** The first promotion is the moment the
approved set becomes work someone else has started. Amending it then would invalidate the
acceptance a running ticket is being reviewed against, and would leave the barrier promoting a
set that no longer matches the spec. Before that moment the set is still a proposal; after it,
the slice's approval is a commitment with a release at the end.

**Why a revision PR and not a second epic.** A merged spec with no started child has approved a
set that has not begun. A new epic would pay a second kickoff, a second spec, a second branch and
a second release for a change that no delivery run has seen. The revision PR reuses the same spec
child, the same branch and the same labels, and it re-approves the revised set with one fresh
PASS.

**Why `done` does not reopen the window.** `done` is not a started status, so a literal
current-status reading would reopen the window when the last delivery child closes — exactly when
the slice is closest to its release. The freeze is a latch: the window shut when the first child
started and does not reopen. A done child is evidence that it once did.

**Why the link invariant is a review finding, not a platform feature.** The platform links by
key and has no notion of "one open PR". The catalog cannot change that, so the rule is a read at
the review, where the ticket's links and their open count are visible. The key rule already
exists in shared `## Delivery`; this slice adds the open count and the blocking finding beside
it.

**Why the spec records an expected snapshot.** A rule without an expectation cannot be checked,
and a live state recorded as acceptance goes stale. The expected snapshot is the smallest thing
that can be compared with an executed set; the delta is the report, and the release is the
verifier.

**Why the unlink correction is a guide fix.** The command exists and the CLI help is the source;
the guide's sentence is stale, not a decision. ADR-0005 and ADR-0008 keep their decisions and
their history; ADR-0020 records the correction and the guide names the command. Fixing a stale
sentence is not a new architecture.

**This spec is its own first instance.** `spec/MIR-289` is forked from `main` at `00e1398`
before this PR exists, this PR targets it, and MIR-292 is the only path to `main`. The merge of
this PR, the stage-2 merge and the release are the first observation of the rule; the live
acceptance matrix is the recorded form of that observation.

**Reversibility.** Nothing here is a platform feature. The window, the freeze and the link
invariant are prose read by the seats; the unlink correction restores a command the CLI already
provides. A later spec that wants a different boundary needs a new ADR and a new spec, which is
the point of the record.
