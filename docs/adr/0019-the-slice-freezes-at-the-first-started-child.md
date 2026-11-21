# 0019 — The slice freezes at the first started child

- Status: Accepted, 2026-11-21 (approved in the MIR-289 grilling)
- Supersedes: nothing — it names the boundary ADR-0007 and ADR-0008 left implicit.

## Context

ADR-0007 moved the slice publication into the spec run and said a spec FAIL reconciles the
children rather than duplicating them. ADR-0008 retargeted the approval at `spec/<epic>` and kept
the force-push for a spec rework. Both assume a rework belongs to the spec pull request; neither
says when a change stops being a rework. The live result is the defect in MIR-279: after its spec
merged, a drifted cleanup list was published as a second spec pull request while the delivery
pull request was already open, and the epic stayed parked with two live PRs and the cleanup
unrun.

The catalog has no moment at which the approved set becomes fixed. Four tickets updated since
19 November carry two linked pull requests; the release lane's rework is legitimate, the other
three are defects. The missing rule is a boundary, not another approval.

## Decision

The **reslice window** is the one period a change is made in place. It opens when the spec is
published and stays open while the spec pull request is unmerged, or after its approval merge
while no child has started. Inside it the Planner amends the open spec PR at the same head and
number, or — once the approval merge has landed — opens one **revision PR** on the same spec
child, rewrites the child set and bodies, and returns the child to `spec_review` for a fresh
PASS. No second spec PR is open while one is open.

The window closes when the spec has merged and any child is in a started status: anything but
`backlog`, `todo`, `done` or `cancelled`. The **freeze** is a latch, not a current-status test:
once the condition has held, the slice is frozen for the rest of its life. `done` is not a
started status, but a done child cannot exist without the freeze having started, so the latch
keeps a delivered slice frozen; a child parked in `blocked` was promoted and counts as started.

A frozen slice is not amended. A real change is a new epic. The old epic runs to its release,
the new epic owns the change, and the affected acceptance criterion is recorded as
**superseded** and cited in the old epic's acceptance. The old epic is not cancelled and its set
is not reopened; a cross-epic dependency is an `--until-issue` condition, never a body list.

No new status, column, label, autopilot or platform event implements this. The Planner reads the
epic's children when a change arrives and the Reviewer sees the set at the spec PASS; the freeze
is policy the seats apply, not a gate the platform enforces.

## Consequences

- An approved set is stable while it runs: changing it after the first child starts costs a new
  epic, so the old epic's acceptance stays honest and its release stays reachable.
- A change to a spec that has merged but not started is still possible without a new epic; it
  costs one revision PR and a fresh PASS, not a second slice.
- Two spec PRs are never open on one ticket, so the platform's link table and the review have
  one head to read.
- A superseded criterion is visible on the old epic instead of being silently dropped, so the
  epic can close on the criteria it kept.
- The rule is read by the seats, so a missed freeze is a review finding, not a platform failure;
  the live acceptance matrix is where the reading is observed.
