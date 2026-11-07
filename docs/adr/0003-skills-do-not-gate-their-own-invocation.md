# 0003 — Skills do not gate their own invocation

- Status: Accepted, 2026-11-07
- Supersedes: nothing; corrects the invocation premise in ADR-0002

## Context

Six skills carried `disable-model-invocation: true` in their frontmatter, and the same six
carried `policy.allow_implicit_invocation: false` in `agents/openai.yaml`. The intent was
"the human triggers these, not the model".

Observed behavior: a bound skill with the flag is still mounted into the agent's skill
directory, but it is excluded from the model-visible skill list, and an explicit human slash
selection does not load its body either — the load is refused as *not available for model
invocation*. The flag therefore did not gate **when** a skill runs; it gated **ever**.

The blast radius was not cosmetic. General had two bound skills and both carried it, so it
could load no bound method at all; Planner lost four of nine (`to-spec`, `to-tickets`,
`wayfinder`, `improve-codebase-architecture`) — exactly the methods its role contract names.

## Decision

The catalog does not set `disable-model-invocation`, and does not set
`policy.allow_implicit_invocation: false`.

Invocation intent lives where it can be read and reviewed: the role contract says when to load
a method, the skill description says what the method is, and the skill body keeps its own
approval and authorization gates.

## Consequences

- Every bound skill is loadable by its agent; a human slash selection works too.
- Descriptions now compete within each seat's bound set, so distinct descriptions matter and a
  colliding pair is a catalog defect, not a dispatch accident (ADR-0002).
- Multica stores no policy metadata for a skill — `multica skill list` returns `config: {}` —
  so there is no platform-side switch to reintroduce. A gate written into the frontmatter is
  invisible there and only surfaces as a missing skill at run time.
- The suite rejects both keys across every skill, so porting an upstream file cannot silently
  bring them back.
