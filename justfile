set positional-arguments
set shell := ["bash", "-cu"]

# Install the locked Node.js dependencies.
setup:
    npm ci

# Validate the catalog offline; no workspace or credentials required.
validate:
    node scripts/config.js

test:
    node --test

# Reconcile this workspace with the catalog by name. Read-only over Git.
sync *args:
    node scripts/sync.js "$@"

# Install or refresh the scheduled sync for this workspace.
schedule *args:
    node scripts/schedule.js "$@"
