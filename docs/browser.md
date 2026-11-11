# Browser verification in the sandbox

How to render a page when a task needs a screenshot, a console check or real paint timings.
Short version: use Playwright's `chrome-headless-shell`; do not launch Google Chrome.

## Why Google Chrome cannot run headless

`--headless=new` aborts before it loads a page, with exit code 21:

```
Failed to create a socket directory.
Failed to create a ProcessSingleton for your profile directory.
```

`ProcessSingleton::Create()` creates its socket with `CreateUniqueTempDir()`, which on macOS
resolves through `NSTemporaryDirectory()` to `/var/folders/<user>/T/`. The seatbelt profile
allows writes under the task workspace and the platform temp areas only, so that `mkdir` is
denied. None of the usual overrides move it:

| Attempt | Result |
| --- | --- |
| `TMPDIR=<workspace>` | ignored — `NSTemporaryDirectory()` returns `/var/folders/…` regardless of the environment |
| `HOME=<workspace>` | ignored — Chrome resolves the home directory from the passwd entry |
| `--user-data-dir=<workspace>` | moves the profile and the lock file, but not the singleton socket directory |

## Screenshot with the headless shell

Playwright's browser cache already ships a headless shell. It has no `ProcessSingleton`, so it
starts under the same sandbox:

```sh
SHELL=$(ls "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-*/chrome-headless-shell | tail -1)
"$SHELL" --no-sandbox --disable-gpu --hide-scrollbars --window-size=1600,1000 \
  --virtual-time-budget=8000 --screenshot=shot.png "$URL"
```

`--virtual-time-budget` is a settle budget, not a wall-clock budget; raise it when the page
loads data late. Swap `--screenshot` for `--dump-dom` to read the rendered DOM instead. If the
cache is empty, install the shell with `npx playwright install chromium-headless-shell` and a
writable `npm_config_cache`.

## Drive it over CDP

[tools/chrome-shot.mjs](tools/chrome-shot.mjs) is a dependency-free reference driver. It waits
for load, an optional selector and network idle, captures console errors, reports navigation,
paint and transfer timings, then screenshots:

```sh
node tools/chrome-shot.mjs "$URL" shot.png --width 1600 --height 1000 \
  --wait-for "[data-chart-paint-layer]" --idle 1000
```

## Playwright MCP

The runtime supports workspace MCP servers (`multica workspace mcp add`, admin only), and
Playwright's MCP server works under this sandbox once it is pointed at the headless shell. It
is a wrapper, not an escape: without `--executable-path` it launches full Chromium and dies on
the same `ProcessSingleton` failure as Google Chrome.

Register it as a stdio server whose command is `/bin/bash` and whose argument is that line
chain:

```sh
SHELL=$(ls "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-*/chrome-headless-shell | tail -1)
HOME=/tmp/pw-mcp-home PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-mcp-browsers npm_config_cache=/tmp/pw-mcp-npm \
  npx -y @playwright/mcp --headless --no-sandbox --isolated \
  --executable-path "$SHELL" --output-dir /tmp/pw-mcp-out
```

The writable `HOME` matters: Playwright writes a registry directory under
`~/Library/Caches/ms-playwright`, which the default seatbelt profile denies. `--isolated` is
required — a `--user-data-dir` is rejected in isolated mode. The trade-off is real: the server
contributes about two dozen tool schemas to every run, so prefer the script when a screenshot
is all you need.

## Limits

- `--no-sandbox` disables Chrome's own renderer sandbox. This is fine for local pages; do not
  use it to inspect untrusted content.
- Only Chromium is covered here. Full Google Chrome stays unusable until the sandbox profile
  allows writes to the macOS per-user temp directory or provides a temp-dir override.
