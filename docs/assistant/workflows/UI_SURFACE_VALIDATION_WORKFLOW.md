# UI Surface Validation Workflow

## What This Workflow Is For

Use this workflow for browser-delivered UI validation, responsive checks, overlays, layout hierarchy, extension packaging, and artifact capture for Quran Rest Coach.

## Expected Outputs

- Repo-owned validation artifacts for the standalone UI surface
- Repo-owned validation artifacts for the live Quran.com extension smoke flow
- Build confirmation for the extension bundle
- Clear fallback guidance for extension validation when the live smoke harness is not available

## When To Use

- Changing top-level UI structure
- Changing `Session`, `History`, or `Settings` layout
- Changing break overlays or resume-saved-session dialog behavior
- Changing side panel layout or reader-context presentation
- Changing companion chip/toast behavior on Quran.com
- Changing extension packaging, manifest wiring, or load/unpacked behavior

## What Not To Do

Don't use this workflow when the task is purely domain logic with no user-visible change.

Instead use `READING_SESSION_WORKFLOW.md` or `LOCAL_PERSISTENCE_WORKFLOW.md`.

Don't use this workflow to invent broad automation that the repo does not already need.

Instead use the repo-owned standalone harness, the repo-owned extension smoke harness, and targeted tests.

## Primary Files

- `tooling/validate-ui-surface.mjs`
- `tooling/validate-extension-smoke.mjs`
- `tooling/build-extension.mjs`
- `src/App.tsx`
- `src/App.css`
- `src/app/CoachDashboard.tsx`
- `src/components/SessionSurface.tsx`
- `src/components/HistorySurface.tsx`
- `src/components/SettingsSurface.tsx`
- `src/components/ReaderContextCard.tsx`
- `src/components/DataTransferPanel.tsx`
- `src/extension/SidePanelApp.tsx`
- `src/extension/ContentCompanion.tsx`
- `src/extension/content.tsx`
- `src/extension/sidepanel.css`
- `src/extension/manifest.json`
- `output/playwright/`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:ui"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run build"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:extension"
```

## Targeted Tests

- `src/App.test.tsx`
- `src/app/CoachDashboard.extension.test.tsx`
- `src/extension/ContentCompanion.test.tsx`
- `test/tooling/validate-ui-surface.test.ts`

## Failure Modes and Fallback Steps

- If the standalone app is not reachable, start the app at `http://127.0.0.1:4173` and rerun the harness.
- If live Quran.com extension automation is unavailable, use `npm run build`, targeted tests, and honest manual unpacked-extension review instead of pretending a missing suite exists.
- If a locator is unstable, prefer `role`, `label`, `text`, or `placeholder` before adding a test id.
- If layout changed materially, validate standalone desktop/mobile artifacts and extension side-panel behavior before closing the task.
- If Quran.com DOM assumptions are in doubt, confirm stable `data-*` metadata before changing selectors.

## Handoff Checklist

- Attach or reference the standalone desktop screenshot, mobile screenshot, and summary JSON when `validate:ui` was run
- State whether extension packaging was validated with `npm run build`
- Attach or reference the extension smoke summary JSON and screenshots when `validate:extension` was run
- Name the exact commands used
- Mention any confirmed caveat that should be added to docs

## Validation Environment Matrix

| Item | Standalone | Extension |
| --- | --- | --- |
| Target runtime | Local Vite app at `http://127.0.0.1:4173` | Unpacked MV3 bundle from `dist/extension` |
| Main command | `npm run validate:ui` | `npm run validate:extension` |
| Browser target | Playwright Chromium | Playwright Chromium with live Quran.com |
| Approved wrapper | `wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && <command>"` | same |
| Artifact location | `output/playwright/` | `output/playwright/` |

## Validation Truth Ladder

1. Run targeted tests first.
2. Run the repo-owned standalone browser harness second.
3. Run `npm run build` to confirm the extension bundle packages cleanly.
4. Run the repo-owned live Quran.com extension smoke harness when side-panel, chip, or Quran.com integration changed.

## Extension Smoke Checklist

1. Run `npm run build`
2. Run `npm run validate:extension`
3. Review `output/playwright/extension-smoke-summary.json`
4. Review the captured extension screenshots if a visual confirmation is needed
5. Fall back to manual unpacked-extension review only when the harness is unavailable or the task needs an extra browser-specific check

## Repo-Owned Harness Rules

- Keep the scripted harness in the repo.
- Successful standalone runs must produce:
  - `session-validation-desktop.png`
  - `session-validation-mobile.png`
  - `session-validation-summary.json`
- Successful extension smoke runs must produce:
  - `extension-smoke-quran-page.png`
  - `extension-smoke-sidepanel.png`
  - `extension-smoke-summary.json`
- Failed standalone runs must produce a failure screenshot.
- Failed extension smoke runs must produce failure screenshots.
- Use one artifact namespace: `output/playwright/`.

## Locator Guidance

- Prefer `role`, `label`, `text`, and `placeholder`.
- Use stable test ids only when user-facing locators are insufficient.
