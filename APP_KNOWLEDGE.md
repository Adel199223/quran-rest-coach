# Quran Rest Coach Canonical Brief

This is the canonical app-level architecture and status brief.

## Product Summary

Quran Rest Coach is a local-first Quran reading coach with a shared React/TypeScript core and two user-facing shells:

- a standalone Vite web app for local session management
- a Chrome/Edge MV3 extension for Quran.com, centered on a side panel and a minimal in-page companion chip

The product is designed around calm break prompts, page-based pacing, low-friction correction controls, and comfort settings that fit dyslexia-aware and ADHD-considerate reading sessions.

The current shared core also supports reading-intent presets, a resume anchor after interruptions, and a local study-later queue for verses or pages that should be revisited without breaking reading flow. Verse-based saved items can also open directly into Quran.com study-oriented verse pages.

Pressure-mode sessions can also use a configurable pre-start countdown, deadline cues, catch-up windows, and a motivating pace score with short “why” summaries.

## Current Status

- Standalone `Session`, `History`, and `Settings` surfaces are implemented.
- Extension side panel, background worker, and Quran.com content companion are implemented.
- Automatic Quran.com route detection and distinct-page observation are implemented.
- Local-only persistence and cross-shell JSON import/export are implemented.
- Reading-intent presets, resume-anchor guidance, and study-later capture are implemented in the shared core.
- Verse-based study-later items can reopen straight into Quran.com verse study pages.
- Deterministic `?review=...` routes are implemented as reset-on-refresh interactive demos for app-first UX review.
- Shared pre-start countdown, pressure deadline cues, and pace scoring are implemented.
- GitHub Actions CI is implemented for the stable repo validation contract.
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
- Reading-intent selection before session start
- Optional pre-start delay before a session becomes active
- Resume-anchor and next-step guidance during active sessions
- Pressure-mode pace score with short reasons in-session, in summaries, and in history
- Export/import JSON for portability
- Interactive `?review=...` routes for deterministic UI validation and manual review

### Extension Side Panel

- Reading-first version of the same `Session`, `History`, and `Settings` surfaces
- Reader-context card showing locale, route type, chapter, verse, and page state
- Narrow layout that keeps session controls primary and secondary detail collapsible
- Quran.com-aware resume anchor and study-later capture on recognized reader views
- History view can reopen saved items on Quran.com or jump directly into verse study pages when the saved item is verse-specific

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

## Pressure Pace Model

- Pressure mode keeps the page-based break tiers but adds scheduled pace windows toward the next break target.
- A shared pre-start countdown can delay the real session start so the reader can get their eyes in place first.
- Final-ten-seconds reading deadline cues are visual by default with a single soft warning cue when enabled.
- Missing a deadline consumes the scheduled break as a catch-up window instead of opening the rest prompt immediately.
- Pace score stays pace-only. It rewards on-time windows, recovery during catch-up, and streaks, while penalizing deadline extensions, missed deadlines, and ending late.
- The app surfaces one main `0..100` score plus short reasons instead of multiple always-visible sub-scores.

## Persistence Model

Persistence is local-first through the async repository in `src/lib/storage.ts`.

Adapters:

- `BrowserStorageAdapter` for browser `localStorage`
- `ChromeStorageAdapter` for extension `chrome.storage.local`

Current keys:

- `qrc.timerSettings.v1`
- `qrc.activeSession.v2`
- `qrc.sessionHistory.v2`
- `qrc.studyLater.v1`
- `qrc.readerContext.v1`

Compatibility notes:

- Legacy active-session and history payloads from `v1` and `v2` are normalized forward when read
- Cross-shell portability is handled through `CoachExportData` JSON export/import
- Export/import includes settings, active session, history, and study-later items
- Reader context stays runtime-local and is not part of the export payload
- The extension cannot directly read the standalone app’s `localStorage`, so import/export is the supported bridge

Schema versions live in `src/domain/contracts.ts`. The current contracts include schema-versioned settings, active-session, and history payloads inside the stable storage keys above. Any persistence shape change should update contracts, normalization logic, storage reads/writes, portability behavior, and targeted tests together.

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
- GitHub Actions runs the stable subset: test, lint, build, assistant-doc validation, workspace hygiene, and standalone UI validation

## Known Constraints

- The extension is Chrome/Edge-first and uses only `storage`, `sidePanel`, and Quran.com host permissions.
- The Quran.com integration is intentionally DOM-metadata based and should not be rewritten to depend on unstable CSS-module selectors.
- PowerShell UNC execution breaks direct npm script runs, so documentation should always prefer the WSL wrapper.
- WSL-native git is the trusted path from this environment because Windows git on the UNC path can trigger safe-directory warnings.
- Localization is still English-first. Arabic copy, RTL layouts, and localized persistence behavior are future work.
