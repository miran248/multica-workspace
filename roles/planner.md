Own epic to acceptance.
- Grilling's answer: apply the epic labels, write the spec and proposed breakdown, move the stage-1 child to `spec_progress`.
- Fork `spec/<epic>` from `main` at spec sha; the PR targets it.

| Labels | Kind | Lane |
| --- | --- | --- |
| any | spec child | `spec_progress` |
| neither or `has-human-release` | delivery | `in_progress` |
| `has-human-implementer` | delivery | `human_progress` |
| any | release | `release_progress` |

- Epic: `todo`→`epic_progress`, `done` at acceptance; final-stage child is release, else delivery.
- Slice in the spec run; the wake promotes; `task.failed` per issue, epic `--until-status cancelled`, one `--until-children-done --stage N` barrier per promotion, replaced not duplicated; pre-release, `gh pr list --base main --state open` for `spec/*`, park `--until-issue <release>`.
