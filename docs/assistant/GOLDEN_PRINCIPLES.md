# Golden Principles

This is the source of truth for enforceable assistant rules in this repo.

## Repo Truth First

- Source code is the final truth when docs drift.
- `APP_KNOWLEDGE.md` is canonical for app-level architecture and status.
- `docs/assistant/APP_KNOWLEDGE.md` stays intentionally shorter than the canonical brief.

## Local-First Boundaries

- Do not invent a backend, API, or remote persistence layer.
- Treat persistence as local-first through the repository abstraction, with `localStorage` for the standalone shell and `chrome.storage.local` for the extension shell.
- Keep session, break, reader-context, history, and portability changes consistent with the typed contracts in `src/domain/contracts.ts`.

## Quran.com Integration Boundaries

- Use stable Quran.com metadata such as `data-page`, `data-verse-key`, `data-chapter-id`, and `data-hizb`.
- Do not couple tracking logic to private APIs or unstable CSS-module selectors.
- Do not auto-start a session just because a recognized Quran.com route is open.
- Do not infer skipped pages. Count only the distinct pages that were actually observed.

## Validation Discipline

- Use WSL-safe wrappers for npm commands from this environment.
- Run targeted tests first, then repo-owned UI validation when browser behavior or layout changed.
- Treat `npm run build` as the packaging validation for the extension.
- Keep standalone UI validation artifacts under `output/playwright/`.

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
- This repo is git-backed now, so branch and worktree guidance is active. Prefer WSL-native git from this environment to avoid Windows UNC safe-directory friction.
