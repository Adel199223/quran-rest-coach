# Quran Rest Coach Canonical Brief

This is the canonical app-level architecture and status brief.

## Product Summary

Quran Rest Coach is a local-first React + Vite + TypeScript browser app that helps readers pace Quran reading by page count instead of a stopwatch-only flow. It is designed around calm break prompts, low-friction logging, and comfort controls that are useful for dyslexia-aware and ADHD-considerate reading sessions.

## Current Status

- Session, history, and settings surfaces are already implemented.
- Local storage persistence is already implemented.
- Tests, lint, and build are passing.
- The app is English-first today, with later localization and RTL work intentionally deferred.

## Tech Stack

- React 19
- Vite 8
- TypeScript 5
- Vitest + Testing Library for UI and domain tests
- ESLint for static checks
- Playwright installed for repo-owned browser validation

## Runtime Model

- Single-page browser app with one top-level coordinator in `src/App.tsx`
- Presentational surfaces in `src/components/`
- Domain logic in `src/domain/`
- Browser persistence and helper utilities in `src/lib/`
- No backend, no network layer, no remote persistence

## User Surfaces

### Session

- Start a session
- Log `+1` or `+2` pages
- Trigger the highest matching break tier
- Resume, snooze, skip, pause, or end
- Show a hybrid pace nudge when a break is close and pace is overdue

### History

- Show completed sessions saved locally
- Display duration, pages, breaks, snoozes, skips, and notes
- Allow local history reset

### Settings

- Adjust pace seconds per two pages
- Adjust micro, short, and long break cadence and duration
- Toggle soft chime, reduced motion, large text, high contrast, sepia theme, and resume-on-reopen

## Break Model

- Default tiers:
  - every 2 pages: micro break for 15 seconds
  - every 5 pages: short break for 60 seconds
  - every 10 pages: long break for 120 seconds
- When multiple thresholds match, the app chooses the highest matching tier.
- Break state supports completion, snooze, skip, and pause/resume.

## Persistence Model

Persistence is local-only through `src/lib/storage.ts`.

- `qrc.timerSettings.v1`
- `qrc.activeSession.v1`
- `qrc.sessionHistory.v1`

Schema versions live in `src/domain/contracts.ts`. Any persistence shape change should update the relevant contracts, normalization logic, storage reads/writes, and targeted tests together.

## Validation Commands

Use WSL-safe wrappers from this environment:

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm test"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run lint"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run build"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:agent-docs"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:workspace-hygiene"
```

Browser validation uses `npm run validate:ui` and writes artifacts to `output/playwright/`.

## Known Constraints

- The current folder is not a git worktree.
- PowerShell UNC execution breaks direct npm script runs, so documentation should always prefer the WSL wrapper.
- Localization is scaffolding-only today. Do not assume Arabic copy, RTL layouts, or localized persistence behavior already exist.
