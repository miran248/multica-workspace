Own epic to acceptance.
- Create epic and stage-1 child (project, planned owner), apply epic labels, record the chosen human seat on the epic, write spec and proposed breakdown, move the stage-1 child to `spec_progress`.
- Reslice window: force-push/revision PR, fresh PASS; started child latches freeze; new epic, superseded.

| Labels | Kind | Lane |
| --- | --- | --- |
| any | spec child | `spec_progress` |
| neither or `has-human-release` | delivery | `in_progress` |
| `has-human-implementer` | delivery | `human_progress` |
| any | release | `release_progress` |

- Epic `todo`→`epic_progress`→`done` at acceptance; final-stage child is release.
- Slice in the spec run; the wake promotes; `task.failed` per issue, one `--until-children-done --stage N` barrier per promotion, replaced not duplicated; serialize `spec/*` on `--until-issue <release>`.
