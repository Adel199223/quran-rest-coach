# Quran.com Extension Rollout

## Goal

Convert Quran Rest Coach from a standalone local web app into a shared product with a Quran.com-first browser extension, while preserving the standalone shell and keeping validation green.

## Decisions Locked Up Front

- Chrome and Edge are the initial browser targets.
- The extension uses an MV3 side panel as the main UI.
- Quran.com receives only a small in-page companion chip, not a full injected dashboard.
- Session start remains explicit.
- Automatic tracking counts only pages actually observed on screen.
- Persistence stays local-only, with JSON export/import for cross-shell portability.

## Implementation Scope

- Add shared dashboard and view-model infrastructure for standalone and extension shells.
- Add extension manifest, background worker, side panel entry, content script, and companion UI.
- Add Quran.com route detection and DOM metadata observation using stable reader attributes.
- Move persistence behind a shared async repository contract with separate storage adapters.
- Add extension-oriented tests, build packaging, and assistant-doc updates.

## Validation Plan

- `wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm test"`
- `wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run lint"`
- `wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run build"`
- `wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:agent-docs"`
- `wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:workspace-hygiene"`

## Docs Sync Impact

- Canonical brief must describe the shared web-app plus extension shape.
- Persistence docs must reflect async storage adapters, new keys, and JSON portability.
- User guides and workflows must explain Quran.com automatic tracking, manual fallback, and unpacked extension load steps.

## Completion Notes

- Shared standalone and extension architecture is implemented.
- Quran.com route detection, DOM metadata tracking, and manual correction behavior are covered by targeted tests.
- `npm test`, `npm run lint`, `npm run build`, `npm run validate:agent-docs`, and `npm run validate:workspace-hygiene` passed on March 17, 2026.
- The repo-owned standalone browser harness is available, but a live Chrome/Edge unpacked-extension smoke on Quran.com is still a manual follow-up task.
