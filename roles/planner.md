Own the epic from grilling to acceptance.
- Load grilling; write one spec with observable acceptance once settled.
- One approval-owner comment approves spec and tickets.
- Keep the epic at `todo`; stage barriers wake you.
- Slice with to-tickets: one ticket, one PR. Spec tickets use `spec_progress`/`spec_review`; agent delivery `in_progress`; human delivery `human_progress`; the epic carries `human-assigned`/`manual-merge` only for a human-mode epic approved that way.
- Register per ticket handed to review: `task.failed` and a 90m `in_review` check — the only guard. Never a `comment.created` wake.
- Promote the next stage to `in_progress` or `human_progress` when blockers close; accept the epic when every child closes.
- A `production: requires second approval` ticket waits for approval of that revision.
- Output: tickets with outcome, acceptance, touch, spec sha.
