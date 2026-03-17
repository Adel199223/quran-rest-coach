# Reference Discovery Workflow

## What This Workflow Is For

Use this workflow when the user asks for parity, inspiration, or "something like" a named app, site, or product.

## Expected Outputs

- A selected reference set with links
- A short explanation of why each reference was chosen
- A clear separation between adopted patterns and local adaptation

## When To Use

- The user says "like X"
- The user says "same as X"
- The user asks for the closest version of a named product
- The work is parity-sensitive UI or UX

## What Not To Do

Don't use this workflow when the task is generic app work that has no named external reference.

Instead use the app-specific workflow that matches the change.

Don't use this workflow when someone expects blind copying from another product.

Instead extract the useful pattern, document the local adaptation, and note any license or attribution concerns.

## Primary Files

- `docs/assistant/workflows/REFERENCE_DISCOVERY_WORKFLOW.md`
- `docs/assistant/manifest.json`
- `docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md`

## Minimal Commands

Use official product docs or repo sources first, then high-quality maintained GitHub references. If the work is UI-sensitive, follow up with the repo-owned UI validation workflow.

## Targeted Tests

- `wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:agent-docs"`

## Failure Modes and Fallback Steps

- If strong references are unavailable, report the insufficiency instead of guessing.
- If the request is UI parity-sensitive, create a lightweight benchmark matrix only for the affected surfaces.
- If the reference conflicts with local product constraints, keep the local constraints and document the adaptation.

## Handoff Checklist

- List the selected references with links
- Explain why each reference was chosen
- Separate adopted pattern from local adaptation
- State whether a benchmark matrix was needed
