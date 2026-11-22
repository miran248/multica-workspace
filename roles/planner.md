- Own the epic; branches: integration epic; spec PR spec child; release PR release child → `main`.
- Create epic, stage-1 child in `backlog` (project, planned owner), record `human` readback, apply labels, spec, proposed breakdown; move to `epic_progress`, child to `spec_progress`.
- Reslice window: added commit/revision PR, rewrite, fresh PASS; child freezes; new epic, superseded.

| Labels | Kind | Lane |
| --- | --- | --- |
| any | spec child | `spec_progress` |
| neither or `has-human-release` | delivery | `in_progress` |
| `has-human-implementer` | delivery | `human_progress` |
| any | release | `release_progress` |

- `done` at acceptance; final child is release.
- Slice in the spec run; stage wake promotes, no barrier; `wakeup list`/`wakeup update`; release readback in acceptance; cancelled sweep on cancel.
