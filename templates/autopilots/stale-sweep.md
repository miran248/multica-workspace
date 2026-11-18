Sweep the Factory's review columns for stale tickets, on this workspace's own runtime.

List every issue in `spec_review`, `in_review`, `human_review` and `release_review`. For each
ticket, read `multica issue timeline <id> --action status_changed --activity-only` and find when
it entered its current column. A ticket that entered less than two hours ago is not stale: leave
it alone. A ticket two or more hours into its column is stale: post one comment with `## What`
(the column and the age), `## Evidence` (the entry time, the elapsed hours and the last actor in
the timeline) and `## Next` (Planner triage), then move it to `blocked`.

- Never mention anyone: the ticket's followers already see the comment.
- Never close or cancel a ticket; `blocked` is the only move.
- Never sweep a ticket outside the four columns, and never run on a ticket already in `blocked`.
- If the timeline is truncated and the entry is not visible, leave the ticket alone and record
  nothing.

The comment carries the age and the last actor before the move; a move without them is not
self-evident. Do not create, link, assign or dispatch work.
