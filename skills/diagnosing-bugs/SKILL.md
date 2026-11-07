---
name: diagnosing-bugs
description: "Diagnose a reproducible failure or performance regression, test causal hypotheses and verify the fix against the original symptom."
metadata:
  version: 0.1.0-pilot.1
---

Read the approved scope, conventions and relevant behavior. Establish an executed symptom-specific feedback loop; minimize the reproducer without losing the failure. For intermittent failures record reproduction rate and controlled conditions. If the required environment or method is unavailable, report the precise blocker and evidence instead of inventing a successful reproduction.

Rank falsifiable causes and state each distinguishing prediction. Probe one variable at a time with focused instrumentation. For performance use comparable before/after workloads and measurement conditions. Preserve secret values outside captured evidence.

Fix the demonstrated cause within scope. Where a suitable existing behavior-level seam exists, confirm a regression test fails for the intended reason before the fix and passes afterward. Re-run the original symptom, appropriate repository checks, and remove temporary instrumentation. If no adequate test seam exists, record the verification limitation and evidence. Complete with reproduction, causal finding, actual check results, exact revision, and remaining risks.
