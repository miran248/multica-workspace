---
name: ticket-slicing
description: "Break a specification into verifiable delivery slices with acceptance coverage, dependencies and review/release work."
metadata:
  version: 0.1.0-pilot.2
---

Read the exact specification revision, decisions, acceptance criteria and existing Multica work before drafting new tickets. Propose narrow complete paths through the relevant layers, each independently observable and verifiable; a slice is one observable outcome behind one narrow interface. Re-slice any ticket expected to exceed roughly 40–60k output tokens or one subsystem. Include review and release responsibilities rather than treating code completion as acceptance.

Record every blocking edge and validate the dependency graph has no hidden prerequisite or cycle. For wide compatibility changes use expand, migrate, contract; explicitly identify any integration point whose earlier slices cannot be independently green. Map every acceptance criterion to work.

Present the exact spec revision and ticket breakdown for approval. Publish approved work through Multica in backlog with parent, revision, observable criteria, blockers, scope and handoff owner. Before approval, keep the breakdown a proposal. Hand the approved scope and dependency graph to Coordinator; leave the human approval parent open for the decision workflow. Finish when coverage and ownership are complete and the next authorized action is clear.
