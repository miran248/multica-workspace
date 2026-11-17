# 0012 — The stale sweep is an autopilot, not a timer

- Status: Accepted, 2026-11-17 (approved in the MIR-227 grilling)
- Supersedes: nothing

## Context

The catalog called two guards essential: a failed run must reach the Planner, and a review that
stalls must not wait forever. The first had a native carrier — `task.failed` — and the second
had none. The Planner was instructed to arm a 90-minute timer per review column, per ticket,
from memory. The ticket the Planner forgot to arm was exactly the ticket nobody watched.

A per-issue timer is also wrong for a second reason: it watches only tickets the Planner
remembered to create it on, and it is duplicated state on every child.

## Decision

One catalog autopilot, `stale-sweep`, runs hourly in the Planner role, reading the review
columns and `awaiting_merge`. It dates each ticket from `issue timeline`, and for a ticket older
than the threshold it posts a `## What` / `## Evidence` / `## Next` comment with the age and
the last actor, then moves the ticket to `blocked` for its normal triage. The threshold is two
hours in a review column and 24 hours at `awaiting_merge`: the first is an agent's own step, the
second is a human's. It never mentions anyone, never closes a ticket and never runs on
`blocked`.

`task.failed` stays a per-issue event the Planner registers, because the platform knows that
fact exactly and a sweep can only infer it. The per-issue 90m timer is deleted. The
cancelled-epic sweep stays as `--until-status cancelled` on the epic. No wake is registered on
`comment.created`.

## Consequences

- One declaration replaces N timers, and it catches the tickets the Planner forgot.
- The sweep runs unattended, so its move to `blocked` must be self-evident: the comment carries
  the age and the last actor before the move.
- A blocked ticket is triaged by the Planner like any other blocker; the sweep does not
  dispatch work.
- The thresholds are policy, not platform facts; a reviewer reads them once from the contract
  and the offline suite pins them against the prompt.
- The first live run is the acceptance: the release records the autopilot's readback and its
  enabled hourly trigger, and the first blocking move is observable evidence.
