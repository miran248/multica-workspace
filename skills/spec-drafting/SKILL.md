---
name: spec-drafting
description: "Draft a specification from settled decisions or a bounded scope-change proposal, preserving the current approval state."
metadata:
  version: 0.1.0-pilot.1
---

Read the request, decision ledger, repository conventions and relevant ADRs. Synthesize supplied decisions directly; investigate missing facts and surface consequential unresolved choices as blockers rather than silently deciding them or restarting settled discovery.

Cover the problem, user-visible outcome, scope/non-goals, concrete scenarios and edge cases, interfaces/invariants, migration needs, acceptance tests, rollout, and open questions. Prefer established behavior-level test surfaces. State evidence for assumptions and the exact approval state. A scope-change proposal identifies the delta from the approved revision and its consequences.

Use Git docs/specs/<change>.md for project specs according to repository practice; keep unapproved drafts provisional. Present the exact revision and proposed ticket breakdown for approval under the durable contract. Multica owns tickets and approval records; do not create GitHub issues or mark a draft as delivery-ready through a skill. Complete when the requested draft is reviewable and its unresolved blockers and next owner are explicit.
