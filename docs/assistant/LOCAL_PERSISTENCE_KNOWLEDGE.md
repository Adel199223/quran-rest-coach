# Local Persistence Knowledge

This is the source of truth for local-first storage behavior, schema-versioned contracts, repository adapters, and portability-safe changes in Quran Rest Coach.

## Storage Model

Persistence is local-only through the async repository in `src/lib/storage.ts`.

Adapters:

- `BrowserStorageAdapter`
  Uses browser `localStorage` for the standalone web shell.
- `ChromeStorageAdapter`
  Uses `chrome.storage.local` for the Quran.com extension.

Current keys:

- `qrc.timerSettings.v1`
- `qrc.activeSession.v2`
- `qrc.sessionHistory.v2`
- `qrc.studyLater.v1`
- `qrc.readerContext.v1`

Compatibility:

- legacy `qrc.activeSession.v1` and `v2` payloads are normalized forward on read
- legacy `qrc.sessionHistory.v1` and `v2` payloads are normalized forward on read
- export/import JSON is the supported bridge between standalone and extension storage

There is no backend and no remote sync path.

## Contract Sources

- `src/domain/contracts.ts`
  Defines schema versions and typed shapes for settings, active session, reader context, observed pages, export payloads, and history entries.
- `src/domain/settings.ts`
  Normalizes incoming settings and supplies defaults.
- `src/domain/session.ts`
  Produces and mutates session state, observed-page tracking, pace-window scoring fields, and history-entry shape.
- `src/lib/storage.ts`
  Reads, validates, normalizes, migrates, exports, and writes repository records.
- `src/extension/chromeStorage.ts`
  Implements the extension storage adapter.

## Change Rules

- If a persisted shape changes, update the relevant contract type and validator in `src/domain/contracts.ts`.
- If defaults or normalization behavior change, update `src/domain/settings.ts`.
- If session state changes affect persisted active-session or history-entry shape, update `src/domain/session.ts`.
- If keys, read/write logic, adapter behavior, or export/import handling change, update `src/lib/storage.ts`.
- If extension storage behavior changes, update `src/extension/chromeStorage.ts`.
- Keep schema-safe changes synchronized across code, docs, and targeted tests.

## Portability Contract

- Export format: `CoachExportData`
- Includes: settings, active session, history entries, and study-later items
- Purpose: move data between standalone `localStorage` and extension `chrome.storage.local`
- Reader context is runtime-local and not part of the export payload

## Failure Modes

- Invalid JSON should fall back safely instead of crashing.
- Invalid persisted settings should normalize to defaults.
- Invalid active-session payloads should resolve to `null`.
- Invalid history arrays should filter out bad entries instead of poisoning the whole list.
- Invalid study-later arrays should filter out bad items instead of poisoning the whole list.
- Invalid reader-context payloads should resolve to `null`.
- Invalid export JSON should be rejected with a clear error instead of partially importing.
- Partial schema changes without portability or adapter updates are a drift risk and should be treated as incomplete work.

## Targeted Validation

Use these first for persistence work:

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm test"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run build"
```

Most relevant tests:

- `src/domain/storage.test.ts`
- `src/lib/storage.portability.test.ts`
- `src/domain/settings.test.ts`
- `src/domain/session.test.ts`
- `src/domain/session.readerTracking.test.ts`

## Notes

- The repository uses code-level schema guards and normalization, not a full migration framework.
- Storage keys stay stable even when the payload `schemaVersion` advances.
- The extension cannot directly read the standalone app’s `localStorage`.
- Future localization or RTL work should not silently change storage semantics without updating this doc.
