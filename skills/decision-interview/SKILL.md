---
name: decision-interview
description: "Resolve consequential planning decisions through focused questions when requirements or tradeoffs remain unsettled."
metadata:
  version: 0.1.0-pilot.1
---

Inspect repository facts and existing decisions first. Maintain a decision ledger: question, prerequisites, accepted answer or evidence, and remaining consequential uncertainty. Separate facts you can investigate from choices requiring the user.

Ask a small numbered batch whose prerequisites are settled. Give tradeoffs and a recommendation; await answers before dependent work while continuing independent investigation. Recompute unresolved questions after each answer. Preserve settled decisions unless cited new evidence, a changed constraint, or an explicit reconsideration request warrants reopening them.

Finish when outcome, scope, constraints, acceptance criteria and consequential tradeoffs are settled. Summarize decisions and nonblocking assumptions. If existing decisions already settle the task, proceed without an interview. A completed interview is distinct from approval of a spec and ticket breakdown.
