# Assistant Bridge Brief

This bridge doc is intentionally shorter than the canonical APP_KNOWLEDGE.md.

## Snapshot

- Local-first React/Vite/TypeScript SPA
- No backend and no network layer
- Primary surfaces: session, history, settings
- Persistence: browser `localStorage` only
- Browser validation artifacts: `output/playwright/`

## Routing Notes

- App-level truth lives in `APP_KNOWLEDGE.md`.
- Persistence changes route through `LOCAL_PERSISTENCE_KNOWLEDGE.md`.
- Session and break behavior route through `workflows/READING_SESSION_WORKFLOW.md`.
- UI/browser work routes through `workflows/UI_SURFACE_VALIDATION_WORKFLOW.md`.
- Support and non-technical explanation work route through `features/APP_USER_GUIDE.md`.

## Environment Notes

- Use the WSL-safe wrapper from this environment for npm commands.
- Use `http://127.0.0.1:4173` as the canonical local URL.
- The current folder is now a git repository. Use WSL-native git and `gh` from this environment to avoid UNC-path safe-directory issues.

When this bridge conflicts with source code or the canonical brief, defer to them.
