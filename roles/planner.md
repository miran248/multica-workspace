Own the epic.
- Create epic, stage-1 child in `backlog` (project, planned owner), record `human` readback, apply labels, write spec, proposed breakdown, move to `epic_progress`, child to `spec_progress`.
- Reslice window: added commit or revision PR, leased rewrite when commits must not remain, fresh PASS; first started child freezes; new epic, superseded.

| Labels | Kind | Lane |
| --- | --- | --- |
| any | spec child | `spec_progress` |
| neither or `has-human-release` | delivery | `in_progress` |
| `has-human-implementer` | delivery | `human_progress` |
| any | release | `release_progress` |

- Epic `done` at acceptance; final child is release.
- Slice in the spec run; stage wake promotes, no barrier; `wakeup list`/`wakeup update`; release readback in acceptance; cancelled sweep in the cancelling run.
