# Performance Baselines

This file is the single source of truth for workspace performance defaults in this repo.

## Editor Excludes

Required excludes live in `.vscode/settings.json`.

- `**/node_modules/**`
- `**/dist/**`
- `**/output/**`

These exclusions should exist in watcher and search settings.

## Artifact Placement

- UI validation artifacts belong in `output/playwright/`.
- Heavy generated output should stay outside the main source tree when feasible.

## Environment Guidance

- Use WSL-safe npm wrappers from this environment.
- Avoid running package scripts directly from the PowerShell UNC path.
- Keep `dist/` and `output/` ignored so validation artifacts do not pollute future git worktrees.

## Diagnosis Order

1. Check `.vscode/settings.json`
2. Check `.gitignore`
3. Confirm artifact location
4. Run `validate:workspace-hygiene`
