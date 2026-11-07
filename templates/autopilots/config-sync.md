Synchronize this workspace with the shared catalog on behalf of {{human_name}}, using this workspace's own runtime and credentials. Do not access another workspace.

Use multica repo checkout {{repository}}. Fetch the default branch and pin the source SHA for the run; do not refresh midway. Do not commit, push or open a pull request: the catalog is read-only input.

Verify multica workspace get returns the exact workspace ID {{workspace_id}} ({{workspace_name}}). Run just setup as needed, just validate, just test, then just sync. The command resolves identity, owners and this workspace's single online Dsh runtime live, then reconciles the catalog by name: matching names are updated in place, an archived agent with a declared name is restored, and an absent object is created. Live objects the catalog no longer declares are archived or deleted, refusing on an agent's open issues, a used label or a project-bound workflow. Never hand-edit a live ID into Git; declare a rename or an authorized retirement in migrations/changelog.jsonl instead.

A failed run keeps a partial journal under .local/, and the retry re-plans from live state: name-keyed creates are recovered, never duplicated. Stop if the source changed during a partial run or the live readback disagrees. Use --keep-unmanaged only when an undeclared live object should survive this run.

Never create, delete, pause, retitle or reschedule the config-sync autopilot: a sync refreshes its title, prompt and assignee only. just schedule is an operator command; do not run it.

Record workspace, pinned source SHA, operation and retirement counts, migrations applied, readback state, journal path and blockers on the report issue. A task exit alone is not verification. Close the report issue only on verified success.
