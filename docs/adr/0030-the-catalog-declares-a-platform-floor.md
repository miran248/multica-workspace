# 0030 — The catalog declares a platform floor

- Status: Accepted, 2026-11-25 (approved in the MIR-313 spec)
- Supersedes: ADR-0001's "the same catalog applies unchanged to any number of workspaces, on any
  account". The anonymity, the live binding and the refusal-before-write rules stand.

## Context

The native blocker model and the stale-sweep retirement only exist on Multica 0.13.0 and newer.
On an older platform the catalog would sync a contract whose wait rule has no carrier and whose
sweep removal leaves the live autopilot running; the workspace would look converged while the
model it describes is absent.

The catalog claimed it applied on any account, and `just sync` wrote into whatever version the
operator had. The version facts are two, not one: the CLI that runs the sync reads and applies the
catalog, and the online Dsh runtime executes the runs the catalog dispatches. A new CLI can
dispatch to an older runtime, so checking one side can pass a workspace that cannot run the
contract.

## Decision

The catalog declares a platform floor of **Multica 0.13.0 or newer**, once, and the resolver
enforces it:

- **Before any write.** The check runs before the plan is applied and before any operation,
  `--dry-run` included: a dry run that prints a plan against an unsupported platform is a result
  the operator would act on.
- **Both sides.** The resolver checks the syncing CLI's version and the bound runtime's
  `metadata.cli_version`. A version below the floor, or a version that cannot be read, refuses and
  names both versions.
- **One declaration.** The minimum lives once in the catalog; `README.md` and `docs/apply.md`
  state the floor and the refusal, and `docs/apply.md`'s refusal table gains the row. No carrier
  repeats the number as a second rule.

ADR-0001's "on any account" becomes "on any account that runs the declared floor"; the catalog
stays anonymous and stateless, and the floor is the one platform requirement it now names.

## Consequences

- An operator knows the requirement before the first write, and a sync can no longer half-apply a
  contract the platform cannot run.
- Upgrading the CLI alone is not enough: the refusal names the runtime too, so a version skew is
  visible instead of surfacing as a wake or a status that never happens.
- The floor is a constant with an ADR behind it; a later minimum is a new decision and a new spec,
  not an edit to the number.
- The offline suite can assert the declaration and the refusal; the live versions are read at
  sync time and reported with the plan, so acceptance reads back what the run actually found.
