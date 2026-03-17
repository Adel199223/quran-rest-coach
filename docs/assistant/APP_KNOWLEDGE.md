# Assistant Bridge Brief

This bridge doc is intentionally shorter than the canonical APP_KNOWLEDGE.md.

## Snapshot

- Local-first Quran reading coach with a shared React/TypeScript core
- Two shells: standalone Vite app and MV3 Quran.com extension
- Extension runtime: side panel, content script, background worker
- Shared surfaces: session, history, settings
- Shared storage repository with `localStorage` or `chrome.storage.local`
- Portability via JSON export/import
- Standalone UI artifacts live in `output/playwright/`
- Extension smoke artifacts also live in `output/playwright/`

## Routing Notes

- App-level truth lives in `APP_KNOWLEDGE.md`.
- Persistence changes route through `LOCAL_PERSISTENCE_KNOWLEDGE.md`.
- Quran.com tracking and break-flow work route through `workflows/READING_SESSION_WORKFLOW.md`.
- Standalone or extension UI work routes through `workflows/UI_SURFACE_VALIDATION_WORKFLOW.md`.
- Support and non-technical explanation work route through `features/APP_USER_GUIDE.md`.

## Environment Notes

- Use the WSL-safe wrapper from this environment for npm commands.
- Use `http://127.0.0.1:4173` as the canonical standalone local URL.
- `npm run build` validates the standalone app and produces the extension bundle in `dist/extension`.
- `npm run validate:extension` is the repo-owned live Quran.com extension smoke harness.
- GitHub Actions runs the stable remote validation subset; the live Quran.com smoke stays local.
- This folder is a git repository. Use WSL-native git and `gh` from this environment to avoid UNC-path safe-directory issues.

When this bridge conflicts with source code or the canonical brief, defer to them.
