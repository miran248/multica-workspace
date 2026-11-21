# 0025 — The epic is in progress from the kickoff

- Status: Accepted, 2026-11-21 (approved in the MIR-304 spec)
- Supersedes: the epic-`todo` clauses of ADR-0004 and ADR-0013, and the "first delivery promotion"
  move of ADR-0011. The kickoff gate, the no-handler state and the Planner's final acceptance
  stand.

## Context

The catalog opens an epic in `todo` and leaves it there until the first delivery promotion, when
it moves to `epic_progress`. The intent was a parked container: `todo` dispatches nobody, so an
inert epic is visible without starting work.

The platform does not agree. `todo` on an agent-assigned issue enqueues the assignee at create
time; only `backlog` parks without a run. So creating the epic in `todo` starts a Planner run the
kickoff did not ask for, and the state the board shows while the spec is written is `todo` — the
same state as a queued epic. `epic_progress` exists, has no handler, and is unreachable until the
slice is half over.

## Decision

The epic is created in `backlog`, and the kickoff moves it to `epic_progress` in the same run that
moves the stage-1 spec child to `spec_progress`. The definition of `epic_progress` becomes **slice
under way**: it holds from the kickoff to the Planner's acceptance. The final move to `done` is
still the Planner's, on the release evidence — the squash on `main`, the checks and the applied
catalog readback. Neither move dispatches a run, because the status has no handler.

Create in `backlog`, move at the kickoff; never create in `todo`. The rule lives once in
`skills/grilling` and is named by the Planner contract and the workflow's `spec_progress`
instruction; the guide describes the two moves.

## Consequences

- Creating an epic starts no run; the kickoff is the only thing that moves it.
- A slice under way is distinguishable from a queued epic from its first moment, not from its
  first delivery promotion.
- The epic's `done` keeps its single author and its evidence; `epic_progress` now covers the spec
  stage too, and no new status or column is added.
- A create that passes `todo` fails the publisher's pre-flight and the suite's scan.
