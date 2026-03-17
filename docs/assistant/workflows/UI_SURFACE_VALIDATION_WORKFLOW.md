# UI Surface Validation Workflow

## What This Workflow Is For

Use this workflow for browser-delivered UI validation, responsive checks, overlays, layout hierarchy, and artifact capture for Quran Rest Coach.

## Expected Outputs

- Repo-owned validation artifacts for the affected UI surface
- A machine-readable validation summary
- Clear fallback guidance when a broader browser suite is not available or is not the trusted path

## When To Use

- Changing top-level UI structure
- Changing `Session`, `History`, or `Settings` layout
- Changing break overlays or resume-saved-session dialog behavior
- Changing responsive hierarchy or interaction copy that needs visual confirmation

## What Not To Do

Don't use this workflow when the task is purely domain logic with no user-visible change.

Instead use `READING_SESSION_WORKFLOW.md` or `LOCAL_PERSISTENCE_WORKFLOW.md`.

Don't use this workflow to invent broad automation that the repo does not already need.

Instead use the repo-owned validate-ui harness plus targeted tests and manual review.

## Primary Files

- `tooling/validate-ui-surface.mjs`
- `src/App.tsx`
- `src/App.css`
- `src/components/SessionSurface.tsx`
- `src/components/HistorySurface.tsx`
- `src/components/SettingsSurface.tsx`
- `output/playwright/`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:ui"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:ui -- --base-url http://127.0.0.1:4173"
```

## Targeted Tests

- `src/App.test.tsx`
- `test/tooling/validate-ui-surface.test.ts`

## Failure Modes and Fallback Steps

- If the local app is not reachable, start the app at `http://127.0.0.1:4173` and rerun the harness.
- If broad browser automation is unavailable, use the repo-owned validate-ui harness, targeted tests, and manual review instead of pretending a missing suite exists.
- If a locator is unstable, prefer `role`, `label`, `text`, or `placeholder` before adding a test id.
- If layout changed materially, capture both desktop and mobile artifacts before closing the task.

## Handoff Checklist

- Attach or reference the desktop screenshot, mobile screenshot, and summary JSON
- Note whether a failure screenshot or trace was produced
- State which surface was validated
- Name the exact harness command used
- Mention any confirmed caveat that should be added to docs

## Validation Environment Matrix

| Item | Value |
| --- | --- |
| Repo/toolchain host | WSL workspace at `/home/fa507/dev/quran-rest-coach` |
| Target runtime | Local Vite app at `http://127.0.0.1:4173` |
| Target browser | Playwright Chromium |
| Approved wrapper | `wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && <command>"` |
| Cross-OS rule | Do not run npm scripts directly from the PowerShell UNC path |
| Artifact location | `output/playwright/` |

## Validation Truth Ladder

1. Run targeted tests first.
2. Run the repo-owned real-browser harness second.
3. Review captured artifacts manually when layout, hierarchy, or parity-sensitive UI changed.

## Repo-Owned Harness Rules

- Keep the scripted harness in the repo.
- Successful runs must produce:
  - `session-validation-desktop.png`
  - `session-validation-mobile.png`
  - `session-validation-summary.json`
- Failed runs must produce a failure screenshot.
- Traces are the deeper-debug fallback when supported.
- Use one artifact namespace: `output/playwright/`.

## Locator Guidance

- Prefer `role`, `label`, `text`, and `placeholder`.
- Use stable test ids only when user-facing locators are insufficient.
