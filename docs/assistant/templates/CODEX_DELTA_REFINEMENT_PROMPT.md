# Codex Delta Refinement Prompt

Use this template only when the user explicitly asks for a follow-up prompt or handoff that folds later prototype, benchmark, or live-review learnings back into an existing product without rebuilding it from scratch.

## Intent

- Treat later prototype or benchmark work as guidance, not as a literal UI or architecture to clone.
- Make Codex inspect repo truth first.
- Keep what is already good.
- Correct what is clunky, incomplete, or mismatched.
- Add only the meaningful, applicable delta.

## Customization Notes

Replace bracketed placeholders as needed:

- `[PROJECT_CANONICAL_DOCS]`
- `[PROJECT_GOAL]`
- `[REFERENCE_INPUTS]`
- `[CURRENT_STATE_TO_VERIFY]`
- `[BOUNDED_DELTA_THEMES]`
- `[CONSTRAINTS_TO_PRESERVE]`
- `[TARGETED_VALIDATION]`
- `[OPTIONAL_UI_SCOPE_NOTE]`

Keep the inspect-first and refine-only rules intact unless the target repo has a very strong reason to differ.

## Ready-To-Paste Prompt

```text
Read these first, in order, adapting names to the repo if equivalent docs already exist:
1. AGENTS.md
2. [PROJECT_CANONICAL_DOCS]
3. the active implementation plan / ExecPlan
4. docs/assistant/INDEX.md only if routing help is needed

This is a bounded refinement pass based on later learnings from [REFERENCE_INPUTS].

Important instruction:
Do not blindly re-implement everything below.
First inspect the current implementation and determine:
- what already exists
- what is already correct
- what is partially present but clunky
- what is still missing

Then:
- keep anything already implemented well
- correct anything partially implemented or awkward
- add only the missing parts that are actually applicable
- if a more correct or more product-appropriate solution exists after research, use that instead of copying the prototype or reference literally

Treat the later learnings as guidance, not as a requirement to duplicate another app or prototype structure 1:1.

Goal:
[PROJECT_GOAL]

Current likely state to verify before changing:
[CURRENT_STATE_TO_VERIFY]

Bounded delta to implement if missing or if the current version is still weak:
[BOUNDED_DELTA_THEMES]

Keep and preserve these existing product constraints:
[CONSTRAINTS_TO_PRESERVE]

Conditional UI / browser rule:
If this pass touches browser behavior, top-level UI, parity-sensitive surfaces, or visual hierarchy:
- read and follow `docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md`
- use fresh repo-owned browser validation artifacts before choosing the next pass
- if named products, sites, or apps are involved, run the reference-discovery workflow first and create or refresh a benchmark matrix only when the repo actually needs parity-sensitive UI comparison
- record any confirmed validation caveats in the repo's assistant runbook, index, or bridge docs so future passes do not rediscover the same unstable path

Docs and roadmap handling:
- update only the docs that should change for the confirmed delta
- be explicit about what was already good, what was corrected, and what stayed out of scope
- if a requested delta is already implemented correctly, record that instead of redoing it
- if the pass confirms a known validation fallback, document the trusted path rather than pretending the broad or unstable path is still primary

Validation:
[TARGETED_VALIDATION]

[OPTIONAL_UI_SCOPE_NOTE]

Implementation rule:
This is an "add if missing, correct if weak, keep if already good" refinement pass.
Do not duplicate existing work just because it appears in this prompt.
Inspect first, decide based on repo truth, and implement only the meaningful delta.
```

## Update Cadence

Review or update this template when:
- the refinement philosophy changes materially
- the reusable UI validation workflow contracts change
- the template starts drifting toward one app instead of staying cross-project
