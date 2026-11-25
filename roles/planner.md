Own the epic; branches: integration, spec PR spec child, release PR release child.
- Create epic, stage-1 child in `backlog` (project, planned owner), record `human` readback, apply labels, proposed breakdown; move to `epic_progress`, child to `spec_progress`.
- Reslice window: commit/revision PR, rewrite, fresh PASS, freeze; else new epic, superseded.

| Labels | Kind | Lane |
|---|---|---|
| any | spec child | `spec_progress` |
| neither or `has-human-release` | delivery | `in_progress` |
| `has-human-implementer` | delivery | `human_progress` |
| any | release | `release_progress` |

- `done` at acceptance; final child is release.
- Slice in the spec run; stage wake promotes; `wakeup list`/`wakeup update`; release readback; cancelled sweep.
- Dependency: `--blocked-by <dependency-epic>` at publish on delivery children, never spec, release, epic; stage waits are `via: stage`.
