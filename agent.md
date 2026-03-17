# Quran Rest Coach Runbook

## Purpose

This is the operational runbook for assistant work in this repository. `APP_KNOWLEDGE.md` is canonical for app-level architecture and status. This runbook focuses on routing, execution policy, and handoff behavior.

## Read Order

Read in this order for most tasks:

1. `APP_KNOWLEDGE.md`
2. The relevant knowledge doc under `docs/assistant/`
3. The relevant workflow under `docs/assistant/workflows/`
4. `docs/assistant/features/*` only for support or plain-language explanation work
5. `docs/assistant/INDEX.md` or `docs/assistant/manifest.json` only if routing is still unclear

## Main-Agent And Sub-Agent Contract

- The main agent owns final planning, integration, and user-facing conclusions.
- Sub-agents are for narrow, bounded tasks: read-heavy repo exploration, parallel fact gathering, isolated validation, or tightly scoped docs gardening.
- Prefer small disjoint tasks over broad delegation.
- Keep sub-agent work read-heavy unless the task clearly has a small write surface.
- Blocking implementation decisions stay on the main thread.

## Validation Environment

This workspace runs best through WSL-safe wrappers because package scripts fail from the PowerShell UNC working directory.

Canonical wrapper:

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && <command>"
```

Canonical local URL:

`http://127.0.0.1:4173`

Validation split:

- `npm run validate:ui` is the trusted standalone-app browser harness
- `npm run build` validates that the extension bundle can be packaged into `dist/extension`
- `npm run validate:extension` is the trusted live Quran.com extension smoke harness

## Approval Gates

Ask before executing:

- destructive filesystem operations
- risky storage-schema or persistence migrations
- force-push or history rewrite
- publish, release, or deploy actions
- non-essential external network activity

## ExecPlans

- Major or multi-file work should start with an ExecPlan in `docs/assistant/exec_plans/active/`.
- Use `docs/assistant/exec_plans/PLANS.md` as the source of truth for plan format and lifecycle.
- Small isolated fixes may skip an ExecPlan if the work is truly local and low-risk.

## Worktree Isolation

- Keep `main` stable and use a branch or worktree for major work.
- For parallel threads, prefer separate worktrees over overlapping edits in one checkout.
- This directory is now a git repository. Use WSL-native git from this environment, because Windows git on the UNC path can trigger safe-directory friction.

## Task Routing

- App architecture or current-state truth: `APP_KNOWLEDGE.md`
- Assistant bridge summary: `docs/assistant/APP_KNOWLEDGE.md`
- Local-first storage contracts, adapters, keys, and portability: `docs/assistant/LOCAL_PERSISTENCE_KNOWLEDGE.md`
- Session logic, Quran.com tracking, break behavior, and correction rules: `docs/assistant/workflows/READING_SESSION_WORKFLOW.md`
- Standalone and extension UI validation, build packaging, and artifact capture: `docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md`
- Named-product inspiration or parity work: `docs/assistant/workflows/REFERENCE_DISCOVERY_WORKFLOW.md`
- Commit, branch, worktree, push, and publish hygiene: `docs/assistant/workflows/COMMIT_PUBLISH_WORKFLOW.md`
- Docs updates and user-guide sync: `docs/assistant/workflows/DOCS_MAINTENANCE_WORKFLOW.md`
- Support and non-technical explanation work: `docs/assistant/features/APP_USER_GUIDE.md`
- Reading-session coaching or walkthroughs: `docs/assistant/features/READING_SESSION_USER_GUIDE.md`

## Support Routing

For support or non-technical explanation tasks, answer from the relevant user guide first, then confirm against canonical technical docs if needed. User guides explain the app simply; canonical docs remain the source of truth when details conflict.

## Template Read Policy

`docs/assistant/templates/*` is read-only template material. Reuse the ideas, not the files.

## Docs Sync

After significant implementation changes, ask exactly:

`Would you like me to run Assistant Docs Sync for this change now?`
