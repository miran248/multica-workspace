# 0024 — Every ticket names a planned owner

- Status: Accepted, 2026-11-21 (approved in the MIR-304 spec)
- Supersedes: the human-lane exception of ADR-0017 — the unassigned create, the publisher's
  "only the human-lane child is unassigned" and the spec PASS exemption. The planned owner, the
  Planner fallback, the publisher pre-flight and the spec-PASS read stand.

## Context

ADR-0017 made every agent-created issue carry a project and its planned owner, and exempted one
lane: the catalog was anonymous and could not name a member, so a human-lane child was created
unassigned and the native `human_progress` member handler bound the member at promotion.

The exemption reads well and fails the check it was written for. The spec PASS reads every child's
owner and skipped the lane it could not name, so an approved set could hold an ownerless ticket by
design. The platform already binds a member to the workflow's `human` handler; the seat is live
state the create call can read, not a name the catalog has to write down. The human lane's planned
owner can be that seat at create time, and the lane stops being the one child nobody is answerable
for before the first move.

## Decision

Every created issue carries `--project` and its planned owner's `--assignee`; status entry still
reassigns natively, so the planned owner only has to be right until the first move. The Planner is
the fallback when the catalog cannot name the seat for the work.

The human lane is no longer an exception: its planned owner is the live human seat, the member the
workflow's `human` handler binds to the `human` role, read at create time. No issue an agent
creates is unassigned.

The rule lives once in shared `## Ownership`, with the same two readers: the publisher pre-flights
every child — project and planned owner, no unassigned lane — and the `spec_review` PASS reads
every child's owner with no human-lane exemption. The member handler still binds the member at
promotion; the planned owner only has to be right until then.

## Consequences

- An approved set cannot contain an ownerless child, and the spec PASS checks the human lane with
  the rest.
- The human lane's owner is live state, so a change of seat needs no catalog edit and a stale
  name is not stored in a ticket.
- A create that cannot resolve the seat fails the pre-flight instead of publishing an unassigned
  child; the fix is the create, not a later sweep.
- No new platform construct and no sweep: the rule is a create argument and two readers.
