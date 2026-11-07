---
name: module-design
description: "Design or improve an approved module interface or test seam when hidden complexity, caller knowledge or testability is the decision."
metadata:
  version: 0.1.0-pilot.1
---

Inspect callers, dependencies, project vocabulary and actual variation. Describe the interface as everything callers must know: types, invariants, ordering, errors, configuration and performance. A deep module hides substantial complexity behind a small useful interface; implementation line counts are not a depth metric.

Compare meaningful alternatives on caller burden, locality of change and behavior-level testability. Prefer existing seams; add adapters for actual varying dependencies rather than hypothetical extension points. Distinguish external interfaces from private internal collaborators; keep implementation choices hidden where callers do not need them.

Implement only the approved change and verify observable behavior through its relevant interface. Surface designs that invalidate the approved spec before expanding scope. Finish with the chosen interface, reasoning, caller effects, checks and known limitations. The project glossary remains authoritative; no parallel design agents are required by this method.
