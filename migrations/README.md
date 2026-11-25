# Migration ledger

`migrations/changelog.jsonl` is an optional, append-only ledger of changes a name-keyed sync
cannot infer. One JSON object per line, applied in order before anything is compared:

```json
{"kind":"rename","entity":"label","from":"ready-for-agent","to":"agent-ready"}
{"kind":"retire","entity":"label","name":"in-use","note":"detach after the migration"}
{"kind":"retire","entity":"autopilot","name":"Legacy sweep","workspaces":["your-workspace"]}
```

- `entity` is `agent`, `autopilot`, `label`, `skill`, `squad` or `workflow`.
- `rename` keeps the live object's identity; `retire` authorizes a guarded deletion.
- `workspaces` limits an event to named workspace slugs. Autopilot events require it because
  the same title exists in every workspace.
- Validation is offline and fails closed: a rename whose target is neither declared nor
  renamed later, or whose source is still declared, blocks every run.
- Once every workspace has passed an event, delete the line. Git keeps the audit.

The file is absent until the first event is needed.
