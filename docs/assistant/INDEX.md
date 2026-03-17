# Assistant Docs Index

Use this index when you need routing help. Do not treat it as canonical architecture truth.

## Core Docs

- `APP_KNOWLEDGE.md`
  Use when you need canonical app architecture, current status, or runtime truth.
- `docs/assistant/APP_KNOWLEDGE.md`
  Use when you need a shorter bridge summary for routing.
- `docs/assistant/GOLDEN_PRINCIPLES.md`
  Use when you need enforceable mechanical rules.
- `docs/assistant/LOCAL_PERSISTENCE_KNOWLEDGE.md`
  Use when touching schema versions, storage keys, or local storage behavior.
- `docs/assistant/PERFORMANCE_BASELINES.md`
  Use when workspace performance or excludes need attention.
- `docs/assistant/LOCALIZATION_GLOSSARY.md`
  Use when touching user-facing wording or future localization prep.

## User Guides

- `docs/assistant/features/APP_USER_GUIDE.md`
  Use when the user wants a plain-language explanation of the app.
- `docs/assistant/features/READING_SESSION_USER_GUIDE.md`
  Use when the user wants a plain-language walkthrough of the reading-session flow.

## Workflows

- `docs/assistant/workflows/READING_SESSION_WORKFLOW.md`
  Use when changing page logging, break prompts, pause/resume, or hybrid pace behavior.
- `docs/assistant/workflows/LOCAL_PERSISTENCE_WORKFLOW.md`
  Use when changing local storage keys, contracts, normalization, or persistence tests.
- `docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md`
  Use when changing browser behavior, top-level UI, overlays, responsive layout, or visual hierarchy.
- `docs/assistant/workflows/LOCALIZATION_WORKFLOW.md`
  Use when updating user-facing terminology or planning future localization work.
- `docs/assistant/workflows/PERFORMANCE_WORKFLOW.md`
  Use when workspace indexing, watcher churn, or artifact placement becomes noisy.
- `docs/assistant/workflows/REFERENCE_DISCOVERY_WORKFLOW.md`
  Use when the user asks for parity or inspiration from a named app, site, or product.
- `docs/assistant/workflows/CI_REPO_WORKFLOW.md`
  Use when validating the repo, checking scripts, or planning future CI-safe routines.
- `docs/assistant/workflows/COMMIT_PUBLISH_WORKFLOW.md`
  Use when commit, branch, worktree, publish, or release requests appear.
- `docs/assistant/workflows/DOCS_MAINTENANCE_WORKFLOW.md`
  Use when syncing assistant docs after confirmed code changes.

## Routing Notes

- Support tasks should start with the user guides, then confirm against canonical docs as needed.
- Template files under `docs/assistant/templates/` are read-only assets for reuse and should not be edited during app work.
- Sub-agents should be used for narrow, bounded, mostly read-heavy tasks. The main agent remains the integrator.
