# Reading Session Guide

## Use This Guide When

Use this guide when someone wants help starting a reading session, understanding Quran.com auto-tracking, correcting page counts, handling break prompts, or knowing what happens when a session is paused, resumed, or saved.

## Do Not Use This Guide For

Do not use this guide for persistence-schema changes, technical debugging, or repo workflow questions. Use the technical docs and workflows for that.

## For Agents: Support Interaction Contract

Guide the user through the flow in order: start, track pages, handle the break prompt, correct if needed, and end or resume the session. Keep wording simple and practical. Only bring in technical terms when they help resolve confusion.

## Canonical Deference Rule

This guide is user-facing. If exact break logic, storage behavior, or edge cases matter, defer to `APP_KNOWLEDGE.md`, `docs/assistant/LOCAL_PERSISTENCE_KNOWLEDGE.md`, and the current source code.

## Quick Start (No Technical Background)

1. Open the `Session` view in the standalone app or extension side panel.
2. Choose the reading intent that best matches your goal.
3. Press `Start session`.
4. If start delay is on, wait for the short countdown or press `Start now`.
5. If you are on Quran.com in the extension, keep reading and let page tracking observe pages as they become visible.
6. If automatic tracking is unavailable or you need to fix progress, open `Correction tools` and use `Correct +1`, `Correct +2`, or `Undo`.
7. If a verse or page needs more study later, use the study-later action instead of stopping your whole session.
8. When a break prompt appears, choose one of the available actions.
9. Press `End session` when you finish reading.

## Terms in Plain English

- Micro break: the shortest break prompt.
- Short break: a medium-length rest prompt.
- Long break: the longest scheduled rest prompt.
- Snooze: delay the current break prompt a little longer.
- Resume now: finish the active break and go back to reading.
- Start delay: the short countdown before a session really starts.
- Reading intent: the reading style you set before starting the session.
- Resume anchor: the page or verse reminder that helps you pick up where you left off.
- Study later: saving the current verse or page for a later review pass.
- Pace score: the single pressure-mode score that summarizes how closely you stayed on target.
- Manual correction: using `Correct +1`, `Correct +2`, or `Undo` to fix the page count yourself.

## How The Flow Works

### Start

Choose a reading intent, then press `Start session` once. The app does not start a session automatically just because Quran.com is open.

The intent changes the coaching tone:

- `Flow` keeps the session steady.
- `Understand` encourages smaller chunks before checking meaning.
- `Memorize` encourages quick rereading.
- `Recover focus` keeps the next step especially small after an interruption.

If start delay is enabled, the app shows a short countdown before the session becomes active. This gives you a moment to place your eyes where you want to begin.

### Track Pages

- In the standalone app, you track pages manually.
- In the extension, recognized Quran.com reader views can auto-track distinct pages as they become visible.
- If auto-tracking is not available on the current view, you can keep using the manual buttons.

### Important Tracking Rules

- Seeing the same page again does not count twice.
- Going backward does not remove progress.
- Jumping ahead does not guess skipped pages. Only pages that were actually observed count.
- Manual correction stays available even when auto-tracking is active.

### Handle Break Prompts

Breaks are triggered by page counts. By default, the app prompts a micro break every 2 pages, a short break every 5 pages, and a long break every 10 pages. If two break rules overlap, the app chooses the stronger one.

In the extension:

- the side panel is the main place to manage the session
- the Quran.com companion chip can open the panel
- the chip expands into a toast when a break is active or nearly due

By default, the break prompt keeps `Resume now` as the main action. Extra actions stay under `More options` so the prompt stays calm and simple.

### Pressure Mode And Score

- Pressure mode keeps the same page-based break targets but adds a live timer toward the next target.
- If you stay on time, you keep the normal break flow.
- If you miss the target, the scheduled break turns into a catch-up window instead of stopping your reading.
- The app keeps one pace score and a short reason summary, such as on-time windows, recovery, best streak, or deadline extensions.

### Resume And Study Later

- The session can show a resume anchor like `Page 51, verse 3:14` so you can restart without guessing.
- The session can also show a next-step hint based on your reading intent.
- On Quran.com, you can park the current verse or page for later study and keep your reading flow going.
- Parked items appear in `History` so you can open them again later on Quran.com.
- If the saved item is a verse, `Open study view` can take you straight into a study-oriented Quran.com verse page.

### Pause Or Resume

You can pause a session and resume it later. If a break was active when you paused, resuming returns you to that break state.

### End And Save

When you press `End session`, the finished session moves into local history on this device.

## Saved Session Reminder

If the app finds an unfinished saved session when you reopen it, it can offer to resume or discard it, depending on your settings and the saved state.
