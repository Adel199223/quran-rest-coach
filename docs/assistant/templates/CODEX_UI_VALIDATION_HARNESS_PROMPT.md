# Codex UI Validation Harness Prompt

Use this template when the user explicitly asks to add or strengthen browser and UI validation scaffolding in an existing repository without rerunning the full documentation bootstrap.

## Intent

- Audit recent validation friction before proposing changes.
- Extract only generalizable lessons.
- Preserve existing good docs, workflows, and tooling.
- Add durable browser-validation guidance without hardcoding one machine, one browser install path, or one repo's temporary workaround.
- Prefer Playwright for browser-delivered UIs unless the target repo already standardizes on another real-browser automation stack.

## Ready-To-Paste Prompt

```text
Read these first, adapting names to the repo if equivalent docs already exist:
1. AGENTS.md
2. the canonical product or architecture brief
3. the roadmap or current implementation plan if the repo is roadmap-driven
4. assistant routing docs (`agent.md`, `docs/assistant/INDEX.md`, bridge docs, and manifest) only as needed

This is a bounded UI/browser validation harness hardening pass for an existing repository.

Important instruction:
Do not replace existing docs or workflows just because they are not shaped exactly like this prompt.
First inspect:
- current browser-validation commands
- current automation tool choice
- current artifact locations
- recent validation failures, stalls, or environment mismatches
- current runbook, index, and manifest routing

Then:
- keep anything already reliable and well-documented
- tighten weak or ambiguous guidance
- add missing workflow, runbook, or manifest coverage only where the repo actually needs it
- capture only the classes of friction that generalize

Primary goal:
Give this repo a durable, repo-owned UI validation workflow that makes browser-heavy work faster, safer, and less dependent on one person's memory.

Required outcomes:
1. Add or strengthen `docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md`.
2. Ensure the assistant manifest can route UI and browser validation work explicitly.
3. Ensure the runbook, index, or bridge docs record any confirmed validation caveats and the trusted fallback path.
4. Keep the guidance app-agnostic and tool-agnostic where possible.

Validation workflow requirements:
- document a validation environment matrix covering:
  - repo/toolchain host
  - target UI runtime and browser
  - approved command wrappers
  - path-translation or interoperability rules when commands cross OS boundaries
  - artifact location
- define a validation truth ladder:
  - targeted tests first
  - repo-owned real-browser harness second
  - captured artifacts and manual review third when visual or benchmark-sensitive work is involved
- if a broad suite is known unstable, document the fallback instead of treating the unstable path as the default
- require primary and secondary viewport artifacts when layout or hierarchy changes materially
- require one artifact namespace so screenshots, traces, and machine-readable validation summaries are easy to find

Repo-owned harness guidance:
- scripted real-browser validation should live in the repo, not in undocumented local command history
- harnesses that create state should set up deterministic data and clean it up afterward
- successful runs should produce artifacts plus a machine-readable validation summary
- failures must produce at least a failure screenshot; traces are the deeper-debug fallback when supported
- prefer user-facing locators (`role`, `label`, `text`, `placeholder`) and use stable test ids only when user-facing locators are insufficient

Reference and parity rule:
- if the user asks for parity or inspiration from a named app, site, or product and the work is UI-sensitive, route through the reference-discovery workflow first
- create a benchmark matrix only when parity-sensitive UI comparison is actually needed
- the matrix should map:
  - surface
  - selected reference
  - local artifact
  - target direction
  - allowed product-specific differences
  - mismatch severity

Safety rules:
- do not hardcode one machine's temp path, browser install path, or shell quirk into the reusable guidance
- do not assume Playwright if the repo already has a stronger standard
- do not add heavyweight benchmark machinery to repos that are not doing parity-sensitive UI work
- keep PowerShell compatibility when the repo is Windows-first, but document approved command wrappers instead of relying on implied shell behavior

Expected output:
1. changed and added docs plus routing files
2. the durable validation contract that was added
3. trusted fallback paths for any confirmed caveats
4. validation checks run to confirm the docs are internally consistent
```

## Update Cadence

Review or update this template when:
- the reusable UI validation workflow contract changes materially
- the preferred browser automation guidance changes
- repeated cross-project validation failures reveal a missing reusable rule
