# Quran Rest Coach Post-Push Anchor

## Current Product State

- Shared standalone app and Quran.com extension are aligned on the same session, history, settings, and pressure-mode pacing behavior.
- Pressure mode now uses real pace windows, catch-up windows, deadline extensions, and a pace-only `0..100` score.
- Score 2.0 is intentionally recovery-aware: it rewards on-time windows, recovery during catch-up, and consistency streaks instead of acting like a mostly penalty-driven grade.
- The UI is calmer and more compact than earlier iterations:
  - four core session metrics
  - one compact pressure strip
  - compact action toolbar
  - lighter history cards and study-later actions
- Review routes under `?review=...` are interactive seeded demos, not static mockups.

## Validation Baseline

Use WSL-safe wrappers from this environment:

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm test"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run lint"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run build"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:ui"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:extension"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:workspace-hygiene"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:agent-docs"
```

## Important Environment Note

- Windows-side Playwright launches from the UNC workspace path are unreliable in this setup.
- For live Quran.com probes, use the WSL-side Playwright path instead.
- Stable Quran.com scoring-relevant metadata is still limited to:
  - `data-page`
  - `data-verse-key`
  - `data-chapter-id`
  - `data-hizb`
- Do not add score weighting based on surah/juz/hizb difficulty heuristics unless Quran.com exposes a new stable public signal.

## Next High-Value Options

1. Real-use score tuning
   Watch a few real pressure-mode sessions and adjust the score weights only if they feel too punishing or too generous.

2. Pressure-mode customization
   Add optional presets for how assertive the pressure cues should feel, while keeping the current defaults stable.

3. Further UI quieting
   If needed, keep trimming top-level copy and reducing repeated labels without hiding essential controls.

4. History review polish
   If real use suggests it, refine the score-reason presentation in history so it stays informative but even quieter.

## Good Continuation Prompt

Use this in a new chat if needed:

> Continue from `docs/assistant/exec_plans/active/2026-03-19-post-push-anchor.md`. The shared app and Quran.com extension are already aligned, Pace Score 2.0 is implemented and validated, and the next work should build on the current pressure-mode/session UX rather than redesigning from scratch.
