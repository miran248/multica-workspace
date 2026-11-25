# 0019 — The runtime selector is provider-agnostic

- Status: Accepted, 2026-11-21 (the MIR-270 container-harness spec, D12; delivered in MIR-275)
- Supersedes: 0001, in part (the single online Dsh runtime and the several-runtime choice)

## Context

ADR 0001 bound every role to "the single online Dsh runtime" and let an operator choose among
several online runtimes with `--runtime-id` / `RUNTIME`. The container-harness cutover replaces
DSH with a Pi runtime profile, and its catalog ticket records the model id the pinned image
lists. The catalog must land and validate offline before that profile exists, and must still
serve a workspace that has not cut over, so it cannot name one provider or one model literal.

## Decision

The selector is provider-agnostic. The schema accepts `pi`, `dsh` and `codex` as the provider
enum, and `defaults.required_provider` names the one the selector reads; `just sync` requires
exactly one online runtime of that provider. Zero or several refuses before any write; there is
no `--runtime-id` / `RUNTIME` choice, because a second online runtime is a misconfiguration to
stop rather than a choice to make. The `flash-first-v1` guard asserts high thinking and the
DeepSeek model family, never a literal model id; `defaults.model` carries the id the pinned
image lists (`deepseek/deepseek-flash`), so a model change is a catalog edit.

## Consequences

- The catalog lands and validates offline before the Pi profile exists; the live apply and the
  five-agent binding stay at cutover.
- A workspace that has not cut over keeps `required_provider: dsh`; `pi` binds the same way
  after cutover, and no script names either provider.
- The schema is the single carrier of the provider enum; no script repeats it.
- A second online runtime of the configured provider is a visible refusal, not an operator
  choice; the old `--runtime-id` / `RUNTIME` pair is gone.
- The model id is data, not a code constant: `deepseek/deepseek-flash` is the default and
  `deepseek/deepseek-v4-pro` is an accepted family sibling.
- The offline suite pins provider selection (zero, one, two) and the guard; no live runtime
  inventory is available to it.
