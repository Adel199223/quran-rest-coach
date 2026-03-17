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
2. Press `Start session`.
3. If you are on Quran.com in the extension, keep reading and let page tracking observe pages as they become visible.
4. If automatic tracking is unavailable or you want to correct progress, use `+1 page`, `+2 pages`, or `Undo`.
5. When a break prompt appears, choose one of the available actions.
6. Press `End session` when you finish reading.

## Terms in Plain English

- Micro break: the shortest break prompt.
- Short break: a medium-length rest prompt.
- Long break: the longest scheduled rest prompt.
- Snooze: delay the current break prompt a little longer.
- Resume now: finish the active break and go back to reading.
- Manual correction: using `+1`, `+2`, or `Undo` to fix the page count yourself.

## How The Flow Works

### Start

Press `Start session` once. The app does not start a session automatically just because Quran.com is open.

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

### Pause Or Resume

You can pause a session and resume it later. If a break was active when you paused, resuming returns you to that break state.

### End And Save

When you press `End session`, the finished session moves into local history on this device.

## Saved Session Reminder

If the app finds an unfinished saved session when you reopen it, it can offer to resume or discard it, depending on your settings and the saved state.
