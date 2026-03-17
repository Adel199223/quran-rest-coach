# Reading Session Workflow

## What This Workflow Is For

Use this workflow for explicit session start, page logging, Quran.com observation rules, break-tier triggers, hybrid pace nudges, pause/resume, snooze/skip behavior, chip/toast behavior, and session-surface behavior tied to the reading flow.

## Expected Outputs

- A bounded implementation or review plan for reading-session behavior
- The smallest necessary code and docs updates
- Targeted validation for session logic, Quran.com tracking, and affected UI

## When To Use

- Changing `+1` or `+2` page logging
- Changing automatic Quran.com page observation
- Changing route parsing or reader-context handling
- Changing break thresholds, durations, or break selection logic
- Changing pause, resume, snooze, skip, or end-session behavior
- Changing session-surface labels, overlays, chip/toast behavior, or manual correction rules

## What Not To Do

Don't use this workflow when the main change is storage shape, adapters, keys, or schema validation.

Instead use `LOCAL_PERSISTENCE_WORKFLOW.md`.

Don't use this workflow when the task is primarily about browser artifact capture or extension load/unpacked validation flow.

Instead use `UI_SURFACE_VALIDATION_WORKFLOW.md`.

## Primary Files

- `src/App.tsx`
- `src/app/CoachDashboard.tsx`
- `src/domain/session.ts`
- `src/domain/breakEngine.ts`
- `src/components/SessionSurface.tsx`
- `src/components/BreakOverlay.tsx`
- `src/extension/quranContext.ts`
- `src/extension/content.tsx`
- `src/extension/ContentCompanion.tsx`
- `src/App.test.tsx`
- `src/domain/session.test.ts`
- `src/domain/session.readerTracking.test.ts`
- `src/domain/breakEngine.test.ts`
- `src/extension/quranContext.test.ts`
- `src/extension/ContentCompanion.test.tsx`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm test"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run build"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:ui"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:extension"
```

## Targeted Tests

- `src/domain/session.test.ts`
- `src/domain/session.readerTracking.test.ts`
- `src/domain/breakEngine.test.ts`
- `src/App.test.tsx`
- `src/extension/quranContext.test.ts`
- `src/extension/ContentCompanion.test.tsx`

## Failure Modes and Fallback Steps

- If break tiers fire at the wrong threshold, confirm the highest matching tier logic before touching UI copy.
- If the same Quran.com page counts twice, fix de-duplication before changing interface text.
- If forward jumps are counting skipped pages, inspect observation logic before touching break math.
- If the current Quran.com view lacks stable metadata, preserve manual fallback instead of inventing inference.
- If the UI looks wrong but logic tests still pass, run the repo-owned UI validation harness for standalone and the repo-owned extension smoke harness for the side panel and chip.
- If a change touches both session logic and persistence shape, finish the reading-flow reasoning here and then switch to `LOCAL_PERSISTENCE_WORKFLOW.md` for schema-safe updates.

## Handoff Checklist

- State which reading-session behavior changed
- Name the exact files touched
- List the targeted tests run
- Call out whether standalone artifacts or extension smoke artifacts were captured
- Mention whether any user-guide or docs-sync update is required
