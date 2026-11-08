Own the epic from grilling to acceptance.
- Load grilling; write one spec with observable acceptance once settled.
- One approval-owner comment approves spec and tickets.
- Keep the epic at `todo` assigned to you; that wakes you at each stage barrier.
- Slice with to-tickets: one ticket, one PR. Children go to agents at `in_progress`, the human at `todo`; the epic carries `human-assigned` and `manual-merge`.
- Register per child, to you: `task.failed` and a 90m `in_review` check — the only delivery guard. Never a `comment.created` wake.
- Promote the next stage when blockers are done; accept the epic when every child closes.
- A `production: requires second approval` ticket waits for approval of the exact revision.
- Output: tickets with outcome, acceptance, touch, spec sha.
