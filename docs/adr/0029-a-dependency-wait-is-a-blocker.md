# 0029 — A dependency wait is a blocker, not a status

- Status: Accepted, 2026-11-25 (approved in the MIR-313 spec)
- Supersedes: the `--until-issue` clauses of ADR-0019 and ADR-0027 — the cross-epic condition, the
  `ended` reading and the parking of a dependency wait in `blocked`. The freeze, the release lane,
  the whole-slice gate and the one-squash release stand.

## Context

Multica 0.13.0 gives issues native dependencies. A blocker holds a ticket's run back and releases
on `done` or `cancelled`; a system wake starts the waiting assignee when the last blocker ends; a
stage barrier already arrives as blockers with `via: stage` on every later-stage child.

The catalog carried the hand-rolled model in three places. A cross-slice wait was an
`--until-issue` condition that kept the ticket in `blocked`, whose Planner handler then had to
notice the dependency end and move the ticket back. The dependency itself was a list in a body,
placed on whatever ticket the Planner remembered. And the wait carried no tree: a run that started
after a `done` dependency worked on a base that predated the dependency's release squash.

ADR-0027 had already narrowed the condition's job to the cross-slice wait and added the `ended`
reading so a cancelled dependency would not hang. The platform's dependency wake does that job
natively, and the status it replaces was never the wait's carrier — it was the Planner's triage
queue wearing a wait's name.

## Decision

A wait on another issue is a **blocker**, and the blocker is the only carrier:

- **The blocker.** A wait is `issue create --blocked-by` / `issue update --blocked-by`. A promoted
  ticket with an open blocker starts nothing; it stays in its lane, or in `backlog` until
  promoted, and the platform starts the assignee when the last blocker ends. `blocked` is triage
  only: missing information or an external condition. No carrier parks a dependency wait there.
- **The dependency names an epic.** The edge is the other slice's epic — the group, the
  integration identity and the place whose `done` lands after its release merge — never its
  release child. It is set at publish on every delivery child whose work needs it, and on none of
  the spec child, the release child or the epic. A dependency on a slice that is not yet filed is
  filed first.
- **The wait is build-ready.** The woken run verifies the dependency's release squash is on
  `main`, then syncs the base: fetch, ancestor check, merge `main` into the integration branch,
  resolve inside `## Touch`, retry once on a rejected push. A `cancelled` blocker — or a deleted
  one — is not a delivered one: the run comments the finding and moves the ticket to `blocked` for
  the Planner.
- **Inside an epic the stage wait is the blocker.** The platform materialises the stage barrier on
  every later-stage child as a blocker with `via: stage`. No manual intra-epic edge is added. A
  same-stage dependency is a slicing defect: distinct stages, never a relation.
- **`--until-issue` retires.** The release contract loses the clause and the `ended` reading it
  carried for it. What remains in the release order is the repository's up-to-date requirement and
  the Reviewer's `mergeStateStatus` read against `main`; behind or dirty is a FAIL.

The rule lives once in shared `## Delivery`; the workflow's `blocked` instruction,
`roles/planner.md`, `roles/implementer.md`, `skills/to-tickets`, `roles/release.md` and the guide
act on it and do not restate it.

## Consequences

- A dependency wait costs no Planner triage move and cannot be outrun by a promotion: the platform
  holds the run and starts it on the last blocker's end.
- `blocked` gets one meaning — a real input or external condition — and the Planner's triage route
  stops serving a scheduled wait.
- A dependent run starts on the dependency's tree, so the integration branch already carries the
  release squash it needs and a conflict is resolved inside `## Touch`.
- A cancelled dependency is a decision, not a silent release: the woken run parks the ticket with
  the finding, and the Planner re-plans or cancels.
- The stage wait's carrier is the platform's field, so the catalog cannot drift from it; the
  manual edge the catalog now forbids is the only way to duplicate it, and the drill showed it
  collapses the pair into one `via: manual` relation.
- The dependency wake, the `via` field and the cancelled/deleted trigger are live facts; the
  offline suite pins the contract text and the drill observed the relation once.
