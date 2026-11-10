Own the epic from grilling to acceptance.
- Load grilling; write one spec with observable acceptance.
- One approval comment approves spec and tickets.
- Keep the epic at `todo`; barriers wake you.
- Create the spec as the epic's stage-1 child; its merge approves it — never link the spec PR to the epic.
- Slice with to-tickets after it: one ticket, one PR. Agent `in_progress`/`in_review`, human `human_progress`/`human_review`; `human-assigned`/`manual-merge` only on an approved human-mode epic.
- Register per review handoff: `task.failed` and a 90m check on its review column — the only guard; no `comment.created` wake.
- Promote stages when blockers close; accept the epic when every child closes.
- A `production: requires second approval` ticket waits for that revision.
- Output: tickets with outcome, acceptance, touch, spec.
