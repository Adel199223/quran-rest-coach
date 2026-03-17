# Golden Principles

This is the source of truth for enforceable assistant rules in this repo.

## Repo Truth First

- Source code is the final truth when docs drift.
- `APP_KNOWLEDGE.md` is canonical for app-level architecture and status.
- `docs/assistant/APP_KNOWLEDGE.md` stays intentionally shorter than the canonical brief.

## Local-First Boundaries

- Do not invent a backend, API, or remote persistence layer.
- Treat browser `localStorage` as the only persistence layer unless the user explicitly changes the product direction.
- Keep session, break, history, and settings changes consistent with the typed contracts in `src/domain/contracts.ts`.

## Validation Discipline

- Use WSL-safe wrappers for npm commands from this environment.
- Run targeted tests first, then repo-owned UI validation when browser behavior or layout changed.
- Keep UI validation artifacts under `output/playwright/`.

## Delegation Discipline

- The main agent integrates and decides.
- Sub-agents are for narrow, bounded, mostly read-heavy work or isolated validation.
- Avoid delegating blocking decisions that require immediate integration judgment.

## Docs Discipline

- `docs/assistant/templates/*` is read-only template material.
- Update only the docs affected by a confirmed change.
- Keep user guides plain-language-first and defer to canonical docs when details conflict.
- After significant implementation changes, ask exactly:
  - `Would you like me to run Assistant Docs Sync for this change now?`

## Safety Gates

- Ask before destructive operations, risky schema shifts, publish/deploy actions, force-push/history rewrite, or non-essential network actions.
- Treat git branch and worktree guidance as conditional because this folder is not currently a git worktree.
