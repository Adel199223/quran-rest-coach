# Quran Rest Coach Canonical Brief

This is the canonical app-level architecture and status brief.

## Product Summary

Quran Rest Coach is a local-first Quran reading coach with a shared React/TypeScript core and two user-facing shells:

- a standalone Vite web app for local session management
- a Chrome/Edge MV3 extension for Quran.com, centered on a side panel and a minimal in-page companion chip

The product is designed around calm break prompts, page-based pacing, low-friction correction controls, and comfort settings that fit dyslexia-aware and ADHD-considerate reading sessions.

## Current Status

- Standalone `Session`, `History`, and `Settings` surfaces are implemented.
- Extension side panel, background worker, and Quran.com content companion are implemented.
- Automatic Quran.com route detection and distinct-page observation are implemented.
- Local-only persistence and cross-shell JSON import/export are implemented.
- Tests, lint, and build are passing.
- Repo-owned live Quran.com extension smoke validation is implemented.

## Tech Stack

- React 19
- Vite 8
- TypeScript 5
- Vitest + Testing Library for UI and domain tests
- ESLint for static checks
- Playwright for repo-owned standalone browser validation
- Esbuild for MV3 extension packaging

## Runtime Model

- Standalone web shell: `src/App.tsx`
- Shared app dashboard and view-model helpers: `src/app/`
- Shared presentational components: `src/components/`
- Shared domain logic and contracts: `src/domain/`
- Shared storage repository and helpers: `src/lib/`
- Extension side panel: `src/extension/SidePanelApp.tsx`
- Extension content script and companion chip: `src/extension/content.tsx` and `src/extension/ContentCompanion.tsx`
- Extension background service worker: `src/extension/background.ts`
- Extension build packaging: `tooling/build-extension.mjs`

There is no backend, no Quran.com account sync, and no remote persistence.

## User Surfaces

### Standalone Web App

- Shared `Session`, `History`, and `Settings` surfaces
- Manual page logging and break handling
- Export/import JSON for portability

### Extension Side Panel

- Reading-first version of the same `Session`, `History`, and `Settings` surfaces
- Reader-context card showing locale, route type, chapter, verse, and page state
- Narrow layout that keeps session controls primary and secondary detail collapsible

### Quran.com Companion Chip

- Tiny shadow-root UI injected on `https://quran.com/*`
- Collapsed chip during normal reading
- Expanded toast when a break is active or pace is overdue
- Lightweight actions only: open panel, resume, snooze, skip

## Quran.com Integration Rules

- Recognized reader routes include `surah`, `verse`, `page`, `juz`, `hizb`, and `rub`
- Optional locale-prefixed routes are supported
- Stable metadata comes from `data-page`, `data-verse-key`, `data-chapter-id`, and `data-hizb`
- Session start remains explicit; route detection alone must not start a session
- Each distinct observed Quran.com page counts once per session
- Repeated visibility of the same page does not increment progress
- Backward scrolling does not decrement progress
- Jumping forward counts only actually observed pages, not inferred skipped pages
- Manual `+1`, `+2`, and `Undo` controls remain available for correction and fallback

## Break Model

- Default tiers:
  - every 2 pages: micro break for 15 seconds
  - every 5 pages: short break for 60 seconds
  - every 10 pages: long break for 120 seconds
- When multiple thresholds match, the app chooses the highest matching tier.
- Break state supports completion, snooze, skip, and pause/resume.
- Hybrid pace nudges are used when the next break is one page away and pace is overdue.

## Persistence Model

Persistence is local-first through the async repository in `src/lib/storage.ts`.

Adapters:

- `BrowserStorageAdapter` for browser `localStorage`
- `ChromeStorageAdapter` for extension `chrome.storage.local`

Current keys:

- `qrc.timerSettings.v1`
- `qrc.activeSession.v2`
- `qrc.sessionHistory.v2`
- `qrc.readerContext.v1`

Compatibility notes:

- Legacy active-session and history payloads from `v1` are normalized forward when read
- Cross-shell portability is handled through `CoachExportData` JSON export/import
- The extension cannot directly read the standalone app’s `localStorage`, so import/export is the supported bridge

Schema versions live in `src/domain/contracts.ts`. Any persistence shape change should update contracts, normalization logic, storage reads/writes, portability behavior, and targeted tests together.

## Validation Commands

Use WSL-safe wrappers from this environment:

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm test"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run lint"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run build"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:ui"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:extension"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:agent-docs"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:workspace-hygiene"
```

Notes:

- `npm run build` now builds the standalone web app and the extension bundle in `dist/extension`
- `npm run validate:ui` validates the standalone app and writes artifacts to `output/playwright/`
- `npm run validate:extension` runs the repo-owned live Quran.com unpacked-extension smoke and writes artifacts to `output/playwright/`

## Known Constraints

- The extension is Chrome/Edge-first and uses only `storage`, `sidePanel`, and Quran.com host permissions.
- The Quran.com integration is intentionally DOM-metadata based and should not be rewritten to depend on unstable CSS-module selectors.
- PowerShell UNC execution breaks direct npm script runs, so documentation should always prefer the WSL wrapper.
- WSL-native git is the trusted path from this environment because Windows git on the UNC path can trigger safe-directory warnings.
- Localization is still English-first. Arabic copy, RTL layouts, and localized persistence behavior are future work.
