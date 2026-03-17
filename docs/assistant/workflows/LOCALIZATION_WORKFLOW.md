# Localization Workflow

## What This Workflow Is For

Use this workflow for user-facing terminology changes, glossary updates, and future localization preparation while the app remains English-first.

## Expected Outputs

- Consistent user-facing wording
- Small, synchronized glossary and copy updates
- Clear notes when broader localization or RTL work is still out of scope

## When To Use

- Changing labels in `src/lib/strings.ts`
- Aligning UI copy with the glossary
- Preparing terminology for future localization work

## What Not To Do

Don't use this workflow when the task is mainly storage, schema, or session-logic behavior.

Instead use `LOCAL_PERSISTENCE_WORKFLOW.md` or `READING_SESSION_WORKFLOW.md`.

Don't use this workflow to silently introduce broad RTL or Arabic UI work.

Instead document the gap and wait for an explicit product request.

## Primary Files

- `src/lib/strings.ts`
- `docs/assistant/LOCALIZATION_GLOSSARY.md`
- `docs/assistant/features/APP_USER_GUIDE.md`
- `docs/assistant/features/READING_SESSION_USER_GUIDE.md`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm test"
```

## Targeted Tests

- `src/App.test.tsx`

## Failure Modes and Fallback Steps

- If new wording conflicts with existing glossary terms, update the glossary first.
- If a requested change implies true localization, record that the repo is still English-first and avoid partial, hidden localization work.
- If copy changes affect support guidance, update only the touched user guide sections.

## Handoff Checklist

- Name the terms changed
- Confirm the glossary stayed in sync
- Note whether user guides needed updates
- List the tests run
