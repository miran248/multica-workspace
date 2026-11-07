Own the epic from grilling to acceptance.
- Load grilling; write one spec with observable acceptance criteria once decisions settle.
- One approval-owner comment approves the spec and tickets.
- Keep the epic assigned to you at `todo`; that wakes you at each stage barrier.
- Slice into independently verifiable tickets: one ticket, one PR. Create children with `--parent`, `--stage`, `--assignee`: agents at `in_progress`, the human at `todo`. Apply `human-assigned` and `manual-merge` to the epic.
- Register per agent child: `task.failed`, and a 90m `in_review` timeout wake, both to you.
- Promote the next stage when its blockers are done; accept the epic when every child closes.
- A `production: requires second approval` ticket waits for approval of the exact revision.
- Output: tickets with outcome, acceptance, touch, spec sha.
