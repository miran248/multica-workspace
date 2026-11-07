# 0001 — The catalog is anonymous and stateless

- Status: Accepted, 2026-11-07 (approved in MIR-120)
- Supersedes: nothing

## Context

The catalog originally carried authored workspace records: workspace, owner, runtime and
project identifiers next to the catalog content. That made the repository private and
consumer-specific, duplicated live platform facts in Git, and leaked identity into every
rendered prompt. There was no way to reuse it on another account, and no way to publish it.

## Decision

Identity is resolved live at every run and never stored: `multica workspace get` for id, name
and slug, `member list` for the owner, `runtime list` for the single online Dsh runtime, and
`git remote get-url origin` for the repository URL in rendered prompts. There is no
`workspaces/` layer, no sync branch, no pull request from a run, and no generated manifest.
Git is read-only input; a sync that converges leaves it untouched.

An ambiguous binding refuses the run before any write: no owner, no online Dsh runtime,
several runtimes without a choice, a missing `origin`, or uncommitted source.

## Consequences

- A sync needs the live platform, an authenticated CLI and an online runtime. It cannot run
  offline, and an offline `just validate` proves the catalog only, not the binding.
- The same catalog applies unchanged to any number of workspaces, on any account.
- One-time operator state (creating the sync control, choosing among several runtimes) is not
  declarable in Git; `just schedule` and the refusal table in [apply](../apply.md) carry it.
- The anonymity test enforces the boundary over every catalog and documentation file: no live
  UUID, no personal email, no workspace slug, no consumer project name, no home path.
