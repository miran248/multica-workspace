# Apply the catalog to a workspace

Run everything from the workspace's own runtime. The `multica` CLI uses that runtime's
credentials; the catalog itself holds none.

## First install

```sh
git clone <this repository> multica-workspace
cd multica-workspace
just setup
just validate && just test
just sync --dry-run     # inspect the plan first
just sync
just schedule           # optional: install the daily sync
```

`just sync` refuses before any write when it cannot resolve an unambiguous binding:

| Refusal | Fix |
| --- | --- |
| no owner | add an owner to the workspace |
| no online Dsh runtime | start the Dsh runtime |
| several online Dsh runtimes | `just sync --runtime-id <id>` or `RUNTIME=<id>` |
| no `origin` | `git remote add origin <url>`; the rendered prompt uses it |
| uncommitted source | commit or stash the checkout |

## Operational notes

- The journal and lock live under `.local/config-sync/`; `CONFIG_SYNC_STATE` moves them. A
  second concurrent run of the same workspace reports the lock holder.
- An interrupted run re-plans from live state. It refuses only if the source moved between
  the partial plan and the retry.
- `--keep-unmanaged` skips retirement for one run. Everything the catalog no longer declares
  is archived or deleted otherwise, under the open-issue, label-use, project-workflow and
  autopilot-event guards.
- Autopilot status and extra triggers are operator state. No sync and no `just schedule` run
  pauses, enables, deletes or reschedules a webhook: `just schedule` ensures exactly one
  enabled schedule trigger and refuses when it finds more than one.
- The runtime is verified only by provider and online status. `runtime list` exposes no model
  or thinking-level inventory, so an unsupported model/effort pair surfaces at agent create
  time, not before the write.
