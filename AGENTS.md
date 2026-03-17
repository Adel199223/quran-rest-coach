# AGENTS.md

This file is the compatibility shim. The full operational runbook lives in `agent.md`.

## Start Here

Read in this order:

1. `APP_KNOWLEDGE.md`
2. `agent.md`
3. The relevant workflow under `docs/assistant/workflows/`
4. `docs/assistant/INDEX.md` only if routing help is still needed

## Approval Gates

Ask before executing:

- destructive file or history operations
- publish, release, or deploy actions
- force-push or history rewrite
- risky persistence-schema changes
- non-essential external network actions

## ExecPlans

Major or multi-file work should create an ExecPlan in `docs/assistant/exec_plans/active/` before implementation and move it to `docs/assistant/exec_plans/completed/` when finished.

## Worktree Isolation

This directory is now a git repository. Use separate worktrees or branches for parallel major changes, and prefer WSL-native git from this environment to avoid Windows UNC safe-directory issues.

## Routing

- Support or plain-language explanation tasks go to `docs/assistant/features/APP_USER_GUIDE.md` first.
- Reading-session walkthroughs go to `docs/assistant/features/READING_SESSION_USER_GUIDE.md`.
- Quran.com tracking, break behavior, and manual-correction work go to `docs/assistant/workflows/READING_SESSION_WORKFLOW.md`.
- Standalone or extension UI validation work goes to `docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md`.
- Named-product parity or inspiration work goes to `docs/assistant/workflows/REFERENCE_DISCOVERY_WORKFLOW.md` before implementation decisions.
- Local storage, adapters, schema, or portability changes go to `docs/assistant/LOCAL_PERSISTENCE_KNOWLEDGE.md` and `docs/assistant/workflows/LOCAL_PERSISTENCE_WORKFLOW.md`.

## Sub-Agent Routing

The main agent is the integrator and final decision-maker. Use sub-agents only for narrow, bounded tasks such as read-heavy exploration, disjoint validation, or tightly scoped docs updates. Do not delegate blocking implementation decisions that need immediate integration judgment.

## Template Read Policy

`docs/assistant/templates/*` is read-only template material for reuse. Do not edit template files during app work.

## Docs Sync

After significant implementation changes, ask exactly:

`Would you like me to run Assistant Docs Sync for this change now?`
