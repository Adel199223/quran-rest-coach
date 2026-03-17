# Local Persistence Workflow

## What This Workflow Is For

Use this workflow for local storage keys, schema-versioned contracts, normalization behavior, safe read/write changes, and persistence-aware validation.

## Expected Outputs

- A schema-safe change plan for local persistence
- Synchronized updates across contracts, normalization, storage logic, and tests
- Explicit notes about compatibility and fallback behavior for invalid stored data

## When To Use

- Changing storage keys
- Changing contract shapes in `src/domain/contracts.ts`
- Changing normalization defaults in `src/domain/settings.ts`
- Changing active-session or history persistence behavior
- Changing local storage parse or validation logic

## What Not To Do

Don't use this workflow when the main change is session UX or break behavior without a storage-shape change.

Instead use `READING_SESSION_WORKFLOW.md`.

Don't use this workflow when the task is mainly user-facing copy or localization prep.

Instead use `LOCALIZATION_WORKFLOW.md`.

## Primary Files

- `src/lib/storage.ts`
- `src/domain/contracts.ts`
- `src/domain/settings.ts`
- `src/domain/session.ts`
- `src/domain/storage.test.ts`
- `src/domain/settings.test.ts`
- `src/domain/session.test.ts`
- `docs/assistant/LOCAL_PERSISTENCE_KNOWLEDGE.md`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm test"
```

## Targeted Tests

- `src/domain/storage.test.ts`
- `src/domain/settings.test.ts`
- `src/domain/session.test.ts`

## Failure Modes and Fallback Steps

- If invalid stored payloads can crash the app, fix parse or validation behavior before changing UI.
- If a storage-shape change is required, update contract guards and normalization together.
- If backward compatibility is unclear, document the risk and keep the fallback conservative rather than silently trusting unknown stored shapes.

## Handoff Checklist

- Name every storage key or contract that changed
- Confirm whether schema guards were updated
- Confirm whether normalization behavior changed
- List the targeted persistence tests run
- Update `LOCAL_PERSISTENCE_KNOWLEDGE.md` if the contract or change rules changed
