# 0031 — The stale sweep retires

- Status: Accepted, 2026-11-25 (approved in the MIR-313 spec)
- Supersedes: ADR-0012 and ADR-0026's clause that kept the stale sweep standing. The cancelled-epic
  sweep, `task.failed`, the conflicts hazard and the stage wake stand.

## Context

`stale-sweep` was the catalog's one stale-review guard: an hourly autopilot that dates every
ticket in a reviewer-handled column from `issue timeline` and, past two hours, comments the age and
moves it to `blocked`. It replaced a per-issue 90m timer because the timer watched only the tickets
the Planner remembered to arm.

The sweep has since become the wrong guard. It runs every hour in every workspace whether or not
anything is stale; it converts a review that stalled — a defect in the handling run — into a
`blocked` move that the Planner then triages; and its move looks exactly like the dependency wait
that this slice removes from `blocked`. The improvement loop and the timeline read a stall
directly, and the platform's own dependency wake removes the class of wait the sweep most often
parked. ADR-0026 kept the sweep when it made the platform's wake the wake; the reason it kept it
is now the reason to remove it.

## Decision

The stale sweep retires. Every carrier goes together:

- the `stale-sweep` autopilot definition and its prompt under `templates/autopilots/`;
- its entry in `templates/default.json`;
- the guide's "The stale sweep" section and the README layout row that names it;
- the glossary's `stale sweep` entry, and the `drill` term's stale-ticket clause;
- the suite's pins for the autopilot and the guide section;
- the explicit retire event in `migrations/changelog.jsonl` that the autopilot retirement guard
  requires, so a live sync archives it instead of leaving it running.

ADR-0012 is superseded, and ADR-0026's clause that kept the sweep standing is superseded with it.
No replacement guard is added: a stalled review is a defect in the handling run, read from
`issue timeline` and the improvement loop. The cancelled-epic sweep is untouched — it runs in the
run that cancels the epic, and its trigger is never a closed ticket.

## Consequences

- One hourly run per workspace disappears, with its token cost and its `blocked` moves.
- `blocked` has one fewer user: the re-read glossary entry is triage only, and a dependency wait is
  a blocker.
- A stalled review is surfaced where it belongs, by the run that owns the review and by the
  Planner's improvement loop; if a stall needs a guard later, it is a new decision with a new ADR.
- The retirement is explicit in the ledger, so a sync retires the live autopilot under the guard
  rather than inferring it from an absence.
- The readback after the release shows the applied catalog without the autopilot and without its
  template or prompt.
