# 0002 — One entry per method; upstream text survives

- Status: Accepted, 2026-11-07 (approved in MIR-121 and MIR-122)
- Supersedes: nothing

## Context

Planner carried fourteen skill entries for about nine methods. Each collision had the same
shape: a short local contract and an upstream method doing the same job, plus aliases whose
entire body was a call to another skill. Dispatch is by skill description, and no usage record
exists, so the entry that wins is the one with the sharper description rather than the one the
seat would choose. Six of the survivors also carried `disable-model-invocation: true`, which
the runtime honours by dropping the skill from model invocation entirely — those six were
unreachable, not merely gated (ADR-0003).

## Decision

One entry per method.

- Where an upstream method exists, its text survives: the local duplicate retires, and what
  only it carried (an approval gate, a Git spec home, a decision ledger) moves into the
  survivor.
- An alias is a preset the human types, not a bound method. Its composition moves into the
  survivor's body as prose.
- A skill attaches to exactly one role. Retiring one deletes its directory, its manifest entry
  and its binding in the same change; there is no unbound shelf to park it on.

## Consequences

- Planner binds nine methods; the catalog holds fifteen skills and no `own` entry.
- A future local method needs its own decision, not a quiet addition beside an upstream one.
- Retiring an upstream-derived entry is reversible at the cost of one file ported from the
  pin; nothing depends on the upstream repository at runtime.
- Provenance counts, `NOTICE` status lists and the manifest move together, and a merged
  survivor that carries upstream text changes its recorded status.
