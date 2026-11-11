# Documentation

Knowledge lives here; agent behavior comes from the workspace catalog, not from this
repository.

| Document | Contents |
| --- | --- |
| [GLOSSARY.md](../GLOSSARY.md) | the catalog's vocabulary, one definition per term |
| [adr/](adr/) | architecture decisions, one per file, immutable once accepted |
| [specs/](specs/) | approved specs, one per result, cited from the Multica issue at a commit |
| [factory.md](factory.md) | how the Factory workflow hands off, its modes, and the live acceptance run |
| [browser.md](browser.md) | headless screenshots and browser checks in the sandbox, and why Google Chrome cannot start there |
| [apply.md](apply.md) | how to apply this catalog to a workspace, and the refusals it can hit |
| [AGENTS.md](../AGENTS.md) | repository conventions, the sync contract, requirements |

## Verification

```sh
just validate && just test     # or: npm run validate && npm test
```

Both are offline: the platform is a stateful test double, and no workspace or credential is
needed. CI runs the same two commands on every push and pull request.
