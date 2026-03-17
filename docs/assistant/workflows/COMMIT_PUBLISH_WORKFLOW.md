# Commit And Publish Workflow

## What This Workflow Is For

Use this workflow when commit, branch, worktree, push, release, or publish actions are requested.

## Expected Outputs

- A safe staging and validation plan
- Clear separation of what should and should not be committed
- Explicit notes when git-based actions cannot run in the current folder

## When To Use

- The user asks for a commit
- The user asks for a branch, worktree, push, or cleanup step
- The user asks for publish or release work

## What Not To Do

Don't use this workflow when the task is normal implementation work that does not involve repo history or publish actions.

Instead use the app-specific workflow that matches the code change.

Don't use this workflow when git operations are unavailable because the folder is not a git worktree.

Instead state the constraint and keep the guidance policy-level.

## Primary Files

- `AGENTS.md`
- `agent.md`
- `docs/assistant/workflows/COMMIT_PUBLISH_WORKFLOW.md`

## Minimal Commands

If git is available, follow this order:

1. Branch safety gate before staging
2. `git fetch --prune origin`
3. `git status --short --branch`
4. `git diff --name-only`
5. `git diff --cached --name-only`
6. `git ls-files --others --exclude-standard`
7. Targeted validation for touched scope
8. Scoped staging and commit

## Targeted Tests

- Scope-specific tests for changed code
- `wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:agent-docs"` when docs changed

## Failure Modes and Fallback Steps

- If the folder is not a git worktree, stop short of claiming that staging or commit commands were run.
- If a change is major and git later becomes available, use a dedicated branch or worktree before staging.
- Never force-push `main`.
- Never publish or release without an explicit user request.

## Handoff Checklist

- State whether git actions were actually available
- State what would be staged separately
- List the validation run before commit or publish
- Call out any approval gate that blocked execution
