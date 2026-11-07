---
name: setup-multica-project
description: "Bring a repository's knowledge layer to Multica: scaffold GLOSSARY.md, docs/adr/, docs/specs/ and a routing-only AGENTS.md for a new project, or strip an existing project's agent instructions and replace them with that routing file. Agent behavior, the issue tracker and labels come from the workspace contract, not the repository."
---

# Setup Multica Project

Two modes, one finish: the repository carries knowledge, the workspace contract
carries agent behavior.

- **New project**: no agent instructions in the repo. Create the knowledge layer
  and a routing-only `AGENTS.md`.
- **Existing project**: the repo predates the workspace contract and carries
  agent instructions. Remove them, repoint their links, keep the knowledge, and
  leave the same routing-only `AGENTS.md`.

The routing file is the boundary. It points at knowledge and verification, and
never states ownership, scope, dispatch, autonomy, issue shape, triage labels or
the tracker: the workspace catalog synced by `just sync` owns those, and
work lives in Multica. Never write `docs/agents/`, tracker config or a label
vocabulary into the repository.

This is a prompt-driven skill. Explore, present what you found, confirm with the
user, then write.

## 1. Explore

Read what exists; don't assume:

- `GLOSSARY.md` and `GLOSSARY-MAP.md` at the repo root
- `docs/adr/`, `docs/specs/`, and the docs index (`docs/README.md` or the repo
  `README.md`)
- Agent-instruction files: root `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`,
  `docs/agents/*`, `.cursor/rules/*`, `.github/copilot-instructions.md`, and any
  nested `AGENTS.md`. List them with
  `git ls-files '*AGENTS.md' '*CLAUDE.md' '*GEMINI.md'`
- Monorepo signals: `pnpm-workspace.yaml`, a `workspaces` field, or populated
  `packages/*`

The mode is **existing** when any agent-instruction file is present, and **new**
otherwise.

## 2. Present and confirm

Summarise what exists and what is missing. Lead with the recommended layout so
the user can accept it in a word:

- **Single-context** (recommended): root `GLOSSARY.md`, `docs/adr/`,
  `docs/specs/`.
- **Multi-context** only when exploration found monorepo signals: root
  `GLOSSARY-MAP.md` pointing at per-context `GLOSSARY.md` files.

For an existing project, list the exact files deletion will remove and say that
their behavior already comes from the workspace contract. Deletion is the only
irreversible step; wait for a yes.

## 3. Write

Create what is missing in both modes:

- `GLOSSARY.md` from [domain.md](./domain.md), seeded with terms the code
  actually uses. Never invent vocabulary.
- `docs/adr/` with a one-line `README.md` naming the convention: one decision
  per file, dated, immutable once accepted.
- `docs/specs/` with a one-line `README.md` naming the convention: approved
  specs, one file per result, cited by the Multica issue at a commit.
- The docs index (`docs/README.md`, or a knowledge section in `README.md`) with
  one line each for the glossary, ADRs, specs, and the repository's real
  contracts, operations and verification command. Leave architecture and
  operations folders to the project; create them only when the repo has content
  for them.

Then, in **existing** mode only, remove the agent instructions:

- Delete every file found in Explore, including nested `AGENTS.md` and all of
  `docs/agents/`.
- Repoint each link that pointed at them (`README.md`, docs index) to the
  repository doc holding that content, usually contracts or invariants.
- Keep the removals in their own commit, apart from the routing file, so history
  shows what was retired.

Finally, write the routing-only `AGENTS.md`. Use the project's real paths and
drop any line with no target:

```markdown
# <Project>

Routing only — agent behavior comes from the workspace agent contract.

- Knowledge index: [docs/README.md](docs/README.md)
- Vocabulary: [GLOSSARY.md](GLOSSARY.md); decisions: [docs/adr/](docs/adr/); approved specs: [docs/specs/](docs/specs/)
- Repository rules: [contracts](docs/architecture/contracts.md) and [invariants](docs/architecture/invariants.md)
- Startup and operations: [development](docs/operations/development.md)
- Verification: `npm run check`
```

Add a local convention line only when the repository enforces it and the routing
file cannot carry it (for example, `Blocked by:` names hard dependencies and
`Touch:` names the paths a ticket may write).

## 4. Done

Report the documents created, the files removed, and that agent behavior comes
from the workspace catalog rather than the repository. Re-run only when the layout
itself changes.
