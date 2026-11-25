# 0021 — The spec records the rule, not the live state

- Status: Accepted, 2026-11-21 (approved in the MIR-289 grilling)
- Supersedes: nothing

## Context

A spec is approved once and executed later. Anything live it records — a count, a set of names,
a workspace id, a line number — is true on the day it is written and may be false on the day the
work runs. The catalog has both failures: a spec that cites a live count as its acceptance, and
a review that treats a drifted count as a spec defect. The first makes the spec lie; the second
turns every delta into a re-approval.

The approved direction wants both a stable spec and current evidence. The spec must say what
should be true and which deviations it already accepts; the run must say what it found.

## Decision

An approved spec records three things: the **rule** — the policy the change follows; the named
**exceptions** — every approved deviation, named with its scope and reason; and the **expected
snapshot** — the live state the acceptance should find, declared as an expectation, never as a
claim that live state is current at read time.

Acceptance is the **executed set** at execution. The delivering ticket reports the set it
actually observed and every delta from the expected snapshot, each with the commit SHA and the
evidence; the release verifies the report at the integrated head. The verdict is a statement
about the run, not a restatement of the spec.

A delta that leaves the rule, the named exceptions and the acceptance unchanged is reported and
verified; it does not revise the spec and does not start a new epic. A delta that changes any of
them is a change, and follows ADR-0019: a revision inside the reslice window, a new epic after
the freeze. No live identifier enters the catalog; the expected snapshot names shapes and
expectations, and the evidence stays on the ticket.

## Consequences

- The spec does not rot: it carries the rule and its expectations, and the executed set carries
  the current truth with its evidence.
- A drift is auditable — expected snapshot, executed set, delta, SHA — instead of being either
  hidden or treated as a spec failure.
- A non-semantic delta does not reopen an approved set; a semantic one cannot hide inside a
  report, because it changes the rule or the acceptance and takes the reslice or new-epic route.
- The release is the verifier, so the evidence is read at the integrated head and not only on the
  delivery ticket.
