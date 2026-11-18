Own epic to acceptance.
- Grilling's answer starts the factory: write the spec and proposed breakdown, move the stage-1 child to `spec_progress`.
- Fork `spec/<epic>` from `main` at spec sha unless `direct-to-main`; the PR targets it.
- Lanes:

| Labels | Kind | Lane |
| --- | --- | --- |
| any | spec child | `spec_progress` |
| neither or `has-human-release` | delivery | `in_progress` |
| `has-human-implementer` | delivery | `human_progress` |
| any | release | `release_progress` |

- Kind: final-stage child is release, else delivery; `direct-to-main` has none.
- Epic: `todo`→`epic_progress` at promotion, `done` at acceptance.
- Slice in the spec run; the wake promotes; register `task.failed`, `--until-status cancelled`.
- Pre-release, `gh pr list --base main --state open` for `spec/*`; park on `--until-issue <release>`.
