# 0017 — Creation names the planned owner

- Status: Accepted, 2026-11-21 (approved in the MIR-264 grilling)
- Supersedes: nothing

## Context

Status entry reassigns an issue to the column's handler; that is how the Factory dispatches.
Creation does not. An agent-created issue carries whatever the create call passed, and the call
is free to pass nothing: no project, so the workspace Default workflow hands off to nobody; no
assignee, so even the right column has no planned owner until the first move. The live
workspace shows the hole at rest as well as it can: 19 of 256 issues are unassigned, all
cancelled, old or probes, and all seven open issues are assigned. The defect is creation and
outside a project, not the move.

The planned owner can also be wrong rather than absent. The MIR-227 release child was created
for the release seat and assigned another seat; nothing at creation or review compared the two,
so the release lane had a ticket whose planned owner was wrong from its first second.

## Decision

Every issue an agent creates carries `--project` and `--assignee` — the project that binds the
Factory graph and the role promotion will pick. Status entry still reassigns natively, so the
created owner only has to be right until the first move. The human lane is the one exception:
the catalog is anonymous and cannot name a member, so a human-lane child is created unassigned,
and the native `human_progress` member handler binds the member at promotion.

The rule lives once, in shared `## Ownership`. It has two readers and no third copy:

- the publisher pre-flights the whole set before it publishes — every child carries a project
  and its planned owner, and only the human-lane child is unassigned; a missing one fails the
  publish;
- the `spec_review` PASS reads the epic's children before the verdict and fails an ownerless
  child.

There is no orphan sweep. The live counts show liveness at rest; the defect is at creation, and
a sweep would be a third reader for a symptom the create call can prevent.

## Consequences

- An issue an agent creates is in the Factory graph and has a planned owner from its first
  second; no issue waits ownerless.
- The publisher and the spec review both refuse an ownerless child, so a set cannot be approved
  with one.
- The human lane is unassigned by design: the member handler is the binding, not the catalog.
- A wrong planned owner is a create defect the publisher sees, not a drift only a later run
  finds.
- No new platform construct and no new column: the rule is a create argument plus the two
  readers, and the shared contract carries it once.
