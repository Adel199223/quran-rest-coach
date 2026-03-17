# Performance Workflow

## What This Workflow Is For

Use this workflow for workspace hygiene, watcher churn, noisy search results, and artifact placement that can slow editing or validation.

## Expected Outputs

- Stable workspace excludes
- Clear artifact placement
- A validated hygiene baseline for this repo

## When To Use

- The workspace feels slow or noisy
- Generated output appears in searches or watchers
- A new artifact folder is being added
- `.vscode/settings.json` or `.gitignore` needs alignment

## What Not To Do

Don't use this workflow when the task is about app behavior or UI logic.

Instead use the app-specific workflows for that behavior.

Don't use this workflow to add stack-specific tooling that is not part of this repo.

Instead keep the baseline narrow and tied to the current Node/Vite toolchain.

## Primary Files

- `.vscode/settings.json`
- `.gitignore`
- `docs/assistant/PERFORMANCE_BASELINES.md`
- `tooling/validate-workspace-hygiene.mjs`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:workspace-hygiene"
```

## Targeted Tests

- `test/tooling/validate-workspace-hygiene.test.ts`

## Failure Modes and Fallback Steps

- If watcher excludes drift, restore `.vscode/settings.json` to the documented baseline.
- If artifacts start appearing in source searches, confirm both `.gitignore` and editor excludes.
- If a new output folder is required, add it to the baseline docs and hygiene validator in the same change.

## Handoff Checklist

- State which workspace rule changed
- Confirm `.vscode/settings.json` and `.gitignore` stayed aligned
- List the hygiene validation results
