---
name: tdd
description: "Implement substantive approved behavior or regression coverage through small behavior-level red/green cycles, or honor an explicit test-first request."
metadata:
  version: 0.1.0-pilot.1
---

Read the approved behavior and existing public test surfaces. Choose a relevant existing seam within approved scope; a material design change is a scope decision, while a routine test choice is not a new approval gate. Derive expected results from independently specified behavior, not the implementation being tested.

Work one behavior at a time: write its test, execute and confirm failure for the intended missing behavior, implement the smallest complete change, then execute to green. Repeat with the next meaningful case. Avoid tests of private implementation details, tautological expected values, and bulk speculative test scaffolding. Use real internal collaborators and substitute external boundaries when appropriate.

Refactor within approved scope only with behavior checks protecting the change. Run the repository's required checks and report the actual red/green evidence and any verification gaps. Finish when accepted behavior is implemented with meaningful tests; this method is not required for routine edits that lack test-worthy behavior.
