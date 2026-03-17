# Reading Session Workflow

## What This Workflow Is For

Use this workflow for page logging, break-tier triggers, hybrid pace nudges, pause/resume, snooze/skip behavior, and session-surface behavior tied to the reading flow.

## Expected Outputs

- A bounded implementation or review plan for reading-session behavior
- The smallest necessary code and docs updates
- Targeted validation for session logic and affected UI

## When To Use

- Changing `+1` or `+2` page logging
- Changing break thresholds, durations, or break selection logic
- Changing pause, resume, snooze, skip, or end-session behavior
- Changing session-surface labels, overlays, or timeline behavior

## What Not To Do

Don't use this workflow when the main change is persistence shape, storage keys, or schema validation.

Instead use `LOCAL_PERSISTENCE_WORKFLOW.md`.

Don't use this workflow when the task is primarily about browser automation or artifact capture.

Instead use `UI_SURFACE_VALIDATION_WORKFLOW.md`.

## Primary Files

- `src/App.tsx`
- `src/domain/session.ts`
- `src/domain/breakEngine.ts`
- `src/components/SessionSurface.tsx`
- `src/components/BreakOverlay.tsx`
- `src/App.test.tsx`
- `src/domain/session.test.ts`
- `src/domain/breakEngine.test.ts`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm test"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:ui"
```

## Targeted Tests

- `src/domain/session.test.ts`
- `src/domain/breakEngine.test.ts`
- `src/App.test.tsx`

## Failure Modes and Fallback Steps

- If break tiers fire at the wrong threshold, confirm the highest matching tier logic before touching UI copy.
- If the UI looks wrong but logic tests still pass, run the repo-owned UI validation harness and review artifacts.
- If a change touches both session logic and persistence shape, finish the session-flow reasoning here and then switch to `LOCAL_PERSISTENCE_WORKFLOW.md` for schema-safe updates.

## Handoff Checklist

- State which session behavior changed
- Name the exact files touched
- List the targeted tests run
- Call out whether UI artifacts were captured
- Mention whether any user-guide or docs-sync update is required
