# 0028 — One human seat per workflow

- Status: Accepted, 2026-11-21 (approved in the MIR-304 spec)
- Supersedes: nothing. ADR-0013's packet has no seat field; the per-epic seat rule lives in the
  kickoff copy in `skills/grilling`, the Planner contract and the guide, and this record replaces
  it there. The kickoff gate, its labels question and its single yes stand.

## Context

The live carriers name the human seat per epic: the kickoff copy in `skills/grilling`,
`roles/planner.md` and the guide's kickoff section say the member the project's workflow binds to
the `human` role is read from the handler and recorded on the epic as issue state. The "per epic"
part is the defect. The workflow has one `human` handler, and every human-lane column —
`human_progress` and the `awaiting_merge` gate — resolves to it. A per-epic field adds a choice
the routing already answers, and it can name a member the handler does not route; the kickoff then
records a seat the workflow will not use.

The handler is also the only live fact that stays true: a seat change is a workflow write, and a
catalog is anonymous so it cannot name the member once and keep it accurate.

## Decision

The workflow's `human` handler is the one human seat. The kickoff reads it from the live workflow
and records it on the epic as a **readback** — a statement of what the handler binds — not a
per-epic choice. Every human-lane column and the `awaiting_merge` gate resolve to the same seat;
two epics in one workflow cannot have different seats. A member handler gets the assignment and
starts no agent run.

The rule lives once in the kickoff copy in `skills/grilling`; the Planner contract names the route
and the guide's kickoff section describes the readback. No workflow field, status or label is
added.

## Consequences

- The seat the epic records is always the seat the workflow routes to; a readback cannot disagree
  with the handler.
- A seat change is one workflow write, not an edit to every open epic.
- A human-mode kickoff has one field less; the packet still ends on the labels question.
- The readback is live state on the epic, so the acceptance can compare it with the handler and
  report a delta instead of trusting the recorded name.
