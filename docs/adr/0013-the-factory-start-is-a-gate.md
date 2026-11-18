# 0013 — The factory start is an explicit gate

- Status: Accepted, 2026-11-18 (approved in the MIR-227 grilling)
- Supersedes: nothing

## Context

Grilling is a conversation, and the transition from it to durable work was a side effect: an
epic, a stage-1 spec child, a published slice and a spec pull request could all appear because
the conversation ended, not because the user asked for a factory run. The board was the first
place the commitment was visible.

No platform construct requires a confirmation before an issue is created or a run starts. The
nearest native break is the spec child's move to `spec_progress`, but a grilling session that
writes the spec itself bypasses that move. What *is* mechanical is the freeze after the spec PR
opens: the merge approves the set, and the stage barrier re-evaluates whenever the child set
changes, so tickets cannot be added to an approved set one at a time.

The two candidate shapes were a gate before opening the epic, and an epic opened as soon as
possible with tickets sliced as information arrived. The second does not survive the first:
an epic is inert until its spec run, so opening it early buys visibility and not progress, and
the slice cannot grow after the spec PR opens anyway.

## Decision

When the grilling frontier empties, the Planner presents one handoff packet and waits:

- the destination,
- the shape: a single ticket, an epic + stage-1 spec child, or a wayfinder map when the
  frontier is not actually empty,
- the mode labels (`has-human-implementer`, `has-human-release`),
- the proposed slice outline.

The answer is the yes that starts the factory. The Planner creates the epic (`todo`) and the
stage-1 spec child (`backlog`), then starts the spec run — the move to `spec_progress`, or the
chat session when it is the run. The run publishes the whole slice in `backlog` and opens the
spec PR; the set is frozen when the PR opens. A later addition is a spec revision on the same
head with the children reconciled, never an incremental ticket on an approved set.

An epic may be opened inert before the graph settles, but only after the destination is named
and only because the user asked; a container for unresolved decisions is a wayfinder map, not an
epic. A small task is a regular ticket and skips the gate. Grilling itself creates nothing.

The gate is one prose copy in `skills/grilling`, the seat that reads it. `roles/planner.md` names
the route and does not restate the rule. The platform cannot require the answer, so the live
check is the Planner run: an empty frontier ends on the packet, and nothing is created or
started before the answer.

## Consequences

- The first sight of the commitment is the packet, not the board.
- "Epic ASAP" is allowed only as an inert container; it does not start work and does not move
  the slice earlier.
- The mechanical half stays the freeze at the spec PR, which the barrier already enforces; the
  gate itself is a run rule and is checked by review.
- The drill proves the graph, not the chat gate; the gate's acceptance is the Planner run that
  shows the packet before the first write.
