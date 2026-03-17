# Docs Maintenance Workflow

## What This Workflow Is For

Use this workflow after confirmed code changes to keep assistant docs, bridge docs, runbooks, manifests, and user guides synchronized without broad rewrites.

## Expected Outputs

- Small, scope-matched docs updates
- Canonical and bridge docs kept consistent
- User-guide updates only when user-visible behavior changed
- Extension build/load docs, tracking rules, and portability docs kept aligned with code

## When To Use

- After a significant implementation change
- After a new validation path or caveat is confirmed
- After product wording, routing, workflow expectations, or extension build/load behavior changes

## What Not To Do

Don't use this workflow when the request would rewrite the whole docs stack after every small change.

Instead use scope-only doc updates for the touched files.

Don't use this workflow when the task is a support reply that does not change repo truth.

Instead answer from the user guides and leave repo docs alone.

## Primary Files

- `README.md`
- `APP_KNOWLEDGE.md`
- `agent.md`
- `AGENTS.md`
- `docs/assistant/APP_KNOWLEDGE.md`
- `docs/assistant/INDEX.md`
- `docs/assistant/manifest.json`
- `docs/assistant/features/`
- `docs/assistant/workflows/`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:agent-docs"
```

## Targeted Tests

- `test/tooling/validate-agent-docs.test.ts`

## Failure Modes and Fallback Steps

- If a change affects architecture truth, update `APP_KNOWLEDGE.md` first and keep the bridge shorter.
- If a change affects the extension runtime shape, update `README.md`, `APP_KNOWLEDGE.md`, and `manifest.json` routing together.
- If a change affects a user-visible flow, update only the touched user-guide sections.
- If a new UI validation caveat is confirmed, document the trusted fallback path in the workflow or runbook instead of rediscovering it later.
- If build or load instructions changed, update the README and the UI validation workflow in the same pass.

## Handoff Checklist

- State which docs changed and why
- Confirm whether user guides changed
- Confirm whether manifest routing changed
- Confirm whether extension build/load or portability docs changed
- Run docs validation after updates
- After significant implementation changes, ask exactly:
  - `Would you like me to run Assistant Docs Sync for this change now?`
