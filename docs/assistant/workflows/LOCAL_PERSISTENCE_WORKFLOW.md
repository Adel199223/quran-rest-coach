# Local Persistence Workflow

## What This Workflow Is For

Use this workflow for storage adapters, repository contracts, schema-versioned shapes, normalization behavior, safe read/write changes, import/export behavior, and persistence-aware validation.

## Expected Outputs

- A schema-safe change plan for local-first persistence
- Synchronized updates across contracts, normalization, repository logic, adapters, and tests
- Explicit notes about compatibility and fallback behavior for invalid stored data or invalid import payloads

## When To Use

- Changing storage keys
- Changing contract shapes in `src/domain/contracts.ts`
- Changing normalization defaults in `src/domain/settings.ts`
- Changing active-session, history, or reader-context persistence behavior
- Changing repository parse, migration, export, or import logic
- Changing extension storage adapter behavior

## What Not To Do

Don't use this workflow when the main change is session UX or break behavior without a persistence-shape change.

Instead use `READING_SESSION_WORKFLOW.md`.

Don't use this workflow when the task is mainly user-facing copy or localization prep.

Instead use `LOCALIZATION_WORKFLOW.md`.

## Primary Files

- `src/lib/storage.ts`
- `src/extension/chromeStorage.ts`
- `src/domain/contracts.ts`
- `src/domain/settings.ts`
- `src/domain/session.ts`
- `src/domain/storage.test.ts`
- `src/lib/storage.portability.test.ts`
- `src/domain/session.readerTracking.test.ts`
- `docs/assistant/LOCAL_PERSISTENCE_KNOWLEDGE.md`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm test"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run build"
```

## Targeted Tests

- `src/domain/storage.test.ts`
- `src/lib/storage.portability.test.ts`
- `src/domain/settings.test.ts`
- `src/domain/session.test.ts`
- `src/domain/session.readerTracking.test.ts`

## Failure Modes and Fallback Steps

- If invalid stored payloads can crash the app, fix parse or validation behavior before changing UI.
- If a storage-shape change is required, update contract guards and normalization together.
- If backward compatibility is unclear, keep the fallback conservative rather than silently trusting unknown stored shapes.
- If portability breaks between standalone and extension shells, fix export/import before adding shell-specific workarounds.
- If reader-context persistence changes, verify that runtime-only fields still degrade safely to `null`.

## Handoff Checklist

- Name every storage key, adapter, or contract that changed
- Confirm whether schema guards were updated
- Confirm whether normalization or portability behavior changed
- List the targeted persistence tests run
- Update `LOCAL_PERSISTENCE_KNOWLEDGE.md` if the contract or change rules changed
