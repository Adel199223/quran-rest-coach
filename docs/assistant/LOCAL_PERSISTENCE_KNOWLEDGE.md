# Local Persistence Knowledge

This is the source of truth for local storage behavior, schema-versioned contracts, and persistence-safe changes in Quran Rest Coach.

## Storage Model

Persistence is local-only through `src/lib/storage.ts`.

Current keys:

- `qrc.timerSettings.v1`
- `qrc.activeSession.v1`
- `qrc.sessionHistory.v1`

There is no backend and no remote sync path.

## Contract Sources

- `src/domain/contracts.ts`
  Defines schema versions and the typed shapes for settings, active session, break state, break log, and history entries.
- `src/domain/settings.ts`
  Normalizes incoming settings and supplies defaults.
- `src/domain/session.ts`
  Produces and mutates session state that is later persisted.
- `src/lib/storage.ts`
  Reads, validates, normalizes, and writes local storage records.

## Change Rules

- If a persisted shape changes, update the relevant contract type and validator in `src/domain/contracts.ts`.
- If defaults or normalization behavior change, update `src/domain/settings.ts`.
- If session state changes affect persisted active-session or history-entry shape, update `src/domain/session.ts`.
- If keys, read/write logic, or parse behavior change, update `src/lib/storage.ts`.
- Keep schema-safe changes synchronized across code, docs, and targeted tests.

## Failure Modes

- Invalid JSON should fall back safely instead of crashing.
- Invalid persisted settings should normalize to defaults.
- Invalid active-session payloads should resolve to `null`.
- Invalid history arrays should filter out bad entries instead of poisoning the whole list.
- Partial schema changes without test updates are a drift risk and should be treated as incomplete work.

## Targeted Validation

Use these first for persistence work:

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm test"
```

Most relevant tests:

- `src/domain/storage.test.ts`
- `src/domain/settings.test.ts`
- `src/domain/session.test.ts`

## Notes

- The current implementation keeps schema version constants in code rather than a migration system.
- Future localization or RTL work should not silently change storage semantics without updating this doc.
