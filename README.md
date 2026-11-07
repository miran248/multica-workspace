# multica-workspace

An anonymous, stateless catalog of [Multica](https://multica.ai) agents, skills, labels,
workflows and one scheduled sync. The repository holds no workspace ID, owner ID, runtime ID,
email or consumer repository URL: every run resolves those from the live platform.

The same catalog applies to any number of workspaces, on any Multica account. A workspace
never writes back to Git, so the catalog stays a delivery input rather than a workspace record.

## Apply it to a workspace

Run this from the workspace's own runtime — the command uses that runtime's `multica`
credentials.

```sh
git clone <this repository> multica-workspace
cd multica-workspace
just setup
just validate && just test
just sync        # reconcile this workspace with the catalog, read back
just schedule    # optional: install the daily sync
```

`just sync` needs a GitHub `origin`; the origin URL is what the scheduled sync's prompt tells
the next run to check out. Everything else is resolved live:

| Fact | Source |
| --- | --- |
| workspace id, name, slug | `multica workspace get` |
| approval owner, report recipient | `multica workspace member list` (role `owner`, `user_id`) |
| agent runtime | `multica runtime list` (the single online Dsh runtime) |
| timezone | the catalog (`UTC`); `just schedule` passes it to the trigger |

`just sync --dry-run` prints the plan and writes nothing. `--keep-unmanaged` skips retirement
for one run. `--runtime-id ID` (or `RUNTIME=ID`) chooses among several online Dsh runtimes.

## What a sync does

1. Resolves the live binding and refuses on any ambiguity: no owner, no online Dsh runtime,
   several runtimes without a choice, no `origin`, uncommitted source.
2. Plans by name against live state. A matching name is updated in place, an archived agent
   with a declared name is restored, an absent object is created.
3. Retires what the catalog no longer declares, unless a guard blocks it: an agent that owns
   open issues, a label in use, a project-bound workflow, an autopilot without an explicit
   retire event.
4. Writes the plan, reads every object back, and records a journal under `.local/config-sync/`
   (override with `CONFIG_SYNC_STATE`). A lock stops concurrent runs of the same workspace.
   A retry re-plans from live state, so a create whose response was lost is found by name and
   never duplicated; only a moved source during a partial run is refused.
5. Leaves Git untouched. Identity is name-based, so no live ID ever enters the catalog.

The `config-sync` autopilot is refreshed by title but never created, deleted, paused or
rescheduled by a sync. `just schedule` is the operator command that creates it when missing
and ensures exactly one enabled schedule trigger.

## Layout

| Path | Contents |
| --- | --- |
| `shared/instructions.md` | rules shared by every role |
| `roles/` | five seats, each one job |
| `skills/` | the twenty-one bound methods; each attaches to exactly one role |
| `templates/default.json` | the only deployable catalog: agents, labels, defaults, documents |
| `templates/autopilots/` | the `config-sync` control and its prompt |
| `templates/workflows/` | the `Factory` project workflow |
| `schemas/` | JSON Schema contracts for the catalog, binding, skills and ledger |
| `migrations/` | optional ledger for renames and authorized retirements |
| `scripts/` | resolver, live binding, plan/apply, lock and journal |
| `tests/` | offline suite; the platform is a stateful test double |

`just validate` resolves the whole catalog against a placeholder binding — no workspace,
credentials or network needed. `just test` runs the suite.

## Skills and provenance

`skills/manifest.json` records the upstream pin (`mattpocock/skills@4ae2317`, MIT) and each
skill's status: `identical`, `fork`, `rewrite` or `own`. A status is an auditable record, not
an enforced byte identity; Git is the pin, and each skill directory is its file set. See
[NOTICE](NOTICE) for attribution.

## Changing the catalog

- Shared behavior belongs in `shared/instructions.md`, role behavior in `roles/`, bindings
  and metadata in `templates/default.json`. A skill edit ships its bytes in the same commit.
- Every skill attaches to exactly one role. Moving a skill between roles is a catalog edit;
  there is no second role field to drift.
- Renames and explicit retirements go in `migrations/changelog.jsonl`; they cannot be inferred
  from names. Events can be scoped to a workspace slug, which an autopilot event must be.
- Run `just validate && just test`, then open a PR. A merge reaches every workspace's next
  scheduled sync; runtime access and verification stay local.

## License

MIT — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
