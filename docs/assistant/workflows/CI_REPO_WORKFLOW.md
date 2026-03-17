# CI And Repo Workflow

## What This Workflow Is For

Use this workflow for repo validation routines, future CI-safe command design, and repo-state checks that affect how changes should be validated.

## Expected Outputs

- A validated command set for the touched scope
- Clear notes about repo-state caveats
- Future-safe CI guidance without pretending hidden infrastructure already exists

## When To Use

- Verifying build, lint, and test health
- Adding or updating validation scripts
- Checking repo-state constraints before broader work

## What Not To Do

Don't use this workflow when the task is mainly commit hygiene or publish flow.

Instead use `COMMIT_PUBLISH_WORKFLOW.md`.

Don't use this workflow to invent a CI provider that is not present.

Instead document the command contract that a future CI system should run.

## Primary Files

- `package.json`
- `vite.config.ts`
- `tooling/`
- `test/tooling/`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm test"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run lint"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run build"
```

## Targeted Tests

- Existing app tests
- Any new tooling tests under `test/tooling/`

## Failure Modes and Fallback Steps

- If the PowerShell UNC path breaks npm script execution, switch to the WSL-safe wrapper immediately.
- If a validator is added, add its command and test coverage in the same change.
- If repo-state assumptions depend on git, confirm branch, remotes, and tracking state from WSL-native git before continuing.

## Handoff Checklist

- Name the commands that define the validation contract
- Confirm whether new tooling tests were added
- Note any repo-state caveats that future automation must respect
