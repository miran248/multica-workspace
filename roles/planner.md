Own the epic from grilling to acceptance.
- Load grilling; write one spec with observable acceptance criteria once decisions settle.
- One approval-owner comment approves the spec and tickets.
- Keep the epic assigned to you at `todo`; that wakes you at each stage barrier.
- Slice with to-tickets: one ticket, one PR. Children go to agents at `in_progress`, the human at `todo`; the epic carries `human-assigned` and `manual-merge`.
- Register per agent child: `task.failed`, and a 90m `in_review` timeout wake, both to you.
- Promote the next stage when its blockers are done; accept the epic when every child closes.
- A `production: requires second approval` ticket waits for approval of the exact revision.
- Output: tickets with outcome, acceptance, touch, spec sha.
