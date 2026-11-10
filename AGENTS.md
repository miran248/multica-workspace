# multica-workspace

This repository is the anonymous, stateless catalog. It contains no workspace identity,
owner, runtime or consumer URL; a sync derives all of them from the live platform. Keep it
that way — that is what makes the catalog reusable and public.

## Knowledge

- Index: [docs/README.md](docs/README.md)
- Vocabulary: [GLOSSARY.md](GLOSSARY.md); decisions: [docs/adr/](docs/adr/); accepted specs:
  [docs/specs/](docs/specs/)
- Applying it to a workspace: [docs/apply.md](docs/apply.md)
- Using the Factory workflow: [docs/factory.md](docs/factory.md)

## Conventions

- Use Conventional Commits: `type(scope): description, ABC-123`, optional scope, `!` for
  breaking changes, the ticket key after a comma at the end. One PR is one squash commit: the
  PR title is the subject, never a merge commit, and never type the pull request number — the
  squash appends `(#N)`. Preserve history.
- Shared behavior belongs in `shared/instructions.md`; role behavior in `roles/`; defaults,
  labels and bindings in `templates/default.json`; skills in `skills/<logical-id>/`.
- A skill attaches to exactly one role, declared only in `templates/default.json`. Do not add
  a second binding or a byte pin: Git is the pin, and the skill directory is its file set.
- Never gate a skill's invocation in the catalog: no `disable-model-invocation`, no
  `allow_implicit_invocation: false`. The runtime drops a gated skill from model invocation
  entirely, including a human slash selection (ADR-0003).
- `migrations/changelog.jsonl` is the only place for a rename or an authorized retirement.
  Scope an autopilot event to a workspace slug.
- Keep the anonymity test green: no live UUIDs, no personal email or user name, no workspace
  slug or consumer repository URL in catalog and documentation files.
- Run `just validate` and `just test` before delivery.

## The sync contract

`just sync` resolves workspace identity, owners, the online Dsh runtime and the `origin` URL
live, then reconciles the catalog by name: match → update, archived agent → restore, absent →
create. Absence is retirement, guarded by open issues, label usage, project-bound workflows
and explicit autopilot events. Every write is read back; the journal lives under `.local/`.
Nothing is committed: a converged run leaves Git untouched.

`just schedule` is operator state: it creates the `config-sync` autopilot if missing and
ensures exactly one enabled schedule trigger. A sync refreshes the control's title, prompt and
assignee only; it never creates, deletes, pauses or reschedules it.

## Requirements

Node.js 26.12.0 (`.tool-versions`), npm, `just`, authenticated local `multica`, Git/GitHub CLI
and `zip` for skill imports.
