# Factory live acceptance A: the autonomous route

Proposed 2026-11-10 in MIR-132. This drill's approval is the approval-owner comment on that
issue; this file approves nothing and is not edited after the drill closes.

## Problem Statement

The catalog pins the Factory graph offline, but the autonomous route — spec, review,
approval, slice, parallel stage, serial follow-up, review, auto-merge, epic acceptance — has
never run end to end on a live project. The live acceptance drill needs one run of that route
in a throwaway project where the artifact is too small to hide a bad handoff behind the work:
four one-line files. Without a spec, the spec lane has nothing to review, the approval gate
has nothing to approve, and the stage barrier has nothing to guard.

## Solution

One spec (this file) and four delivery tickets. Each ticket adds exactly one one-line file
under `docs/stress/` on `factory-stress` through exactly one pull request; nothing else in the
repository changes. `a1`, `a2` and `a3` are one parallel stage; `a4` is a second stage blocked
by all three. The spec PR is reviewed in the spec lane, the approval owner approves this spec
and the ticket list in one comment on MIR-132 — the same comment records the auto-merge
prerequisite in D5 — and only then are the four tickets created.

This file lives under `docs/stress/`, not `docs/specs/`, because the drill's project confines
every change to that directory; it is drill evidence, not an accepted catalog decision.

## User Stories

1. As the approval owner, I want one spec, one ticket list and one merge-path confirmation to approve, so the approval gate is exercised once and nothing is sliced before it clears.
2. As the Reviewer, I want observable acceptance criteria, so the spec verdict is decided by evidence rather than taste.
3. As the Implementer, I want one ticket and one PR per file, so a red delivery is attributable to a single change.
4. As the drill operator, I want a parallel stage and a serial follow-up, so both the stage barrier and the parent wakeups are exercised.
5. As a catalog reader, I want the drill confined to `docs/stress/`, so the throwaway project leaves the real contract untouched.

## Implementation Decisions

**D1 — The drill touches only `docs/stress/`.** The changed paths are one spec file and four
delivery files: `docs/stress/spec-a.md` and `docs/stress/a1.md`–`a4.md`. No catalog, ADR,
index, workflow, template, skill, migration, CI or test file changes.

**D2 — One file, one line, one identifier.** `docs/stress/aN.md` contains exactly one line —
the identifier of the ticket that created it, as the platform assigned it (for example
`MIR-135`) — and a trailing newline. No heading, date, title or trailing text. The ticket
carries the exact expected line, so the check is a string equality, not a judgement.

**D3 — One ticket, one PR, base `factory-stress`.** Every pull request targets
`factory-stress`, never `main`; its title carries its ticket key so the platform links it; its
diff is exactly one added file at `docs/stress/aN.md`. The spec PR is the same shape for the
spec lane: one added file at `docs/stress/spec-a.md`.

**D4 — Shape: three parallel, one serial.** `a1`, `a2` and `a3` are stage 1 with no blocking
edges between them; `a4` is stage 2 and declares a blocking edge on each of `a1`, `a2` and
`a3`. The Planner promotes stage 1 after approval and stage 2 only when all three stage-1
tickets close; the epic is accepted when all four close.

**D5 — No new checks; two repository capabilities are approval-owner prerequisites.** The
repository's existing `just validate` and `just test` are the only checks, and they must stay
green. The autonomous route's merge path is not on today: the repository has
`allow_auto_merge: false`, and `factory-stress` has no required checks, rulesets or branch
protection. The approval owner's first drill action is to enable "Allow auto-merge" on the
repository, and optionally to require `validate` on `factory-stress`; both are repository
settings, not a file a pull request can carry, exactly as `catalog-rollout.md` D5 treats
branch protection. Until it is on, `gh pr merge --auto --squash` is refused for the spec PR
and for every delivery PR: a PASS is recorded, the PR stays open, and the same owner enables
the capability and arms it, or merges the spec PR, before the approval comment. The epic
carries no `manual-merge` label, so no human merges a *delivery* PR; a refused auto-merge is
reported, never repaired by a hand merge that would falsify the route.

## Acceptance criteria

These are forward criteria, not evidence: nothing is delivered when the spec lands. They are
checked at the exact head of each PR and again on `factory-stress` after the drill:

1. `docs/stress/a1.md`, `a2.md`, `a3.md` and `a4.md` each exist, each contain exactly one line, and each line equals the identifier of the ticket that created it.
2. Four delivery PRs were opened, one per ticket, each based on `factory-stress`, each changing exactly its own `docs/stress/aN.md`, and each merged by the auto-merge the Reviewer armed after the approval owner enabled it (D5) — no hand merge.
3. `a4` was promoted only after `a1`, `a2` and `a3` had all closed; its PR opened after theirs merged. The status timelines show that order.
4. The spec PR added only `docs/stress/spec-a.md`, was reviewed in `spec_review`, and landed through the same auto-merge path.
5. A diff of `factory-stress` against `7eb4374` names the five paths this epic adds — `docs/stress/spec-a.md` and `docs/stress/a1.md`–`a4.md` — and no path outside `docs/stress/`. Sibling drill files from the other live-acceptance tickets — `docs/stress/manual-merge.md` (MIR-133), `human-merge.md` (MIR-134), `human-agent.md` (MIR-135) — may also land on `factory-stress`; they are owned by their own tickets and not counted as this epic's changes.
6. MIR-132 is accepted only when its four delivery children are closed; no ticket was sliced before the approval-owner comment.
7. The approval-owner comment on MIR-132 records both approvals — this spec and the ticket breakdown, and the D5 auto-merge prerequisite being on — before stage 1 was promoted.

## Testing Decisions

A delivery run runs `just validate && just test` (expected green on a docs-only diff), then
proves `git diff --name-only origin/factory-stress...HEAD` names exactly one path and
`git show HEAD:docs/stress/aN.md` is one line with the ticket key. The Reviewer repeats both
at the PR head and adds the base-branch check; a second changed path or a wrong base is a
blocking finding. The spec PR is held to the same one-path, one-line-of-record shape. Before
promoting stage 1, the Planner reads the repository's auto-merge capability and treats it as
off until it reads true; a refused `gh pr merge --auto` is reported as a blocker, not repaired
by a hand merge. The post-drill branch check lists `docs/stress/` and separates the five paths
this epic added from the sibling drill files named in criterion 5.

## Out of Scope

Everything the catalog actually owns: `docs/specs/`, `docs/adr/`, the knowledge index, CI,
templates, roles, skills and migrations. No production change, no sync, no label or mode
change. The other live acceptance scenarios (manual-merge, human implementations, blocked
triage) have their own tickets and are not shaped by this spec.

## Ticket breakdown (proposed; created only after the approval-owner comment)

| Stage | Ticket | Outcome | Touch | One PR |
| --- | --- | --- | --- | --- |
| 1 | Deliver `docs/stress/a1.md` | the file exists with one line: this ticket's identifier | `docs/stress/a1.md` | yes |
| 1 | Deliver `docs/stress/a2.md` | the file exists with one line: this ticket's identifier | `docs/stress/a2.md` | yes |
| 1 | Deliver `docs/stress/a3.md` | the file exists with one line: this ticket's identifier | `docs/stress/a3.md` | yes |
| 2 | Deliver `docs/stress/a4.md` | the file exists with one line: this ticket's identifier; blocked by the three stage-1 tickets | `docs/stress/a4.md` | yes |

Each ticket carries this spec's sha, its own `Touch:` line and its exact expected file
content. The three stage-1 tickets are created assigned to the Implementer at stage 1; the
stage-2 ticket is created in `backlog` at stage 2 and promoted when its blockers close.

## Further Notes

One workflow consequence belongs in the approval decision. MIR-132 entered `spec_progress`
because that is the only declared entry to the spec lane, but the Factory graph declares no
`spec_progress` to `todo` edge, and a `spec_review` PASS on a ticket sends it to `done`. On
PASS this epic therefore closes at spec acceptance, while the approval comment and the four
delivery children are still owed. Two repairs preserve the drill's shape after PASS: the
approval owner moves MIR-132 back to `todo` from the board (a member may move any ticket), or
the four children are created under the closed epic with a follow-up carrying acceptance. The
Planner does neither on its own; this note exists so the approval is made with the consequence
visible.

A second consequence is the merge path the autonomous route assumes. Auto-merge is off on the
repository and `factory-stress` carries no required check, so the Reviewer's PASS cannot land
the spec PR — or any delivery PR — until the approval owner turns the capability on (D5). The
switch must be on before this spec is armed, not only before delivery: otherwise PR #20 stays
open after its PASS and the approval comment the drill waits on never starts. That is a
repository setting, not a file, so it is listed as an approval prerequisite with the rework
rather than as a delivery step; if the owner decides against it, the drill stops at spec
review instead of substituting a hand merge that the autonomous route never exercises.

This revision answers the first review: D5 and the approval gate now carry the auto-merge
prerequisite, criterion 5 counts only the five paths this epic adds and names the sibling
drill files, and the acceptance criteria say they are proposals rather than evidence. The
approved direction — four one-line files, one ticket and one PR each, three parallel then one
serial — is unchanged.

