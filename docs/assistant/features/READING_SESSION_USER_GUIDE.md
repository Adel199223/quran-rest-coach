# Reading Session Guide

## Use This Guide When

Use this guide when someone wants help starting a reading session, logging pages, handling break prompts, or understanding what happens when a session is paused, resumed, or saved.

## Do Not Use This Guide For

Do not use this guide for persistence-schema changes, technical debugging, or repo workflow questions. Use the technical docs and workflows for that.

## For Agents: Support Interaction Contract

Guide the user through the flow in order: start, log pages, handle the break prompt, and end or resume the session. Keep wording simple and practical. Only bring in technical terms when they help resolve confusion.

## Canonical Deference Rule

This guide is user-facing. If exact break logic, storage behavior, or edge cases matter, defer to `APP_KNOWLEDGE.md`, `docs/assistant/LOCAL_PERSISTENCE_KNOWLEDGE.md`, and the current source code.

## Quick Start (No Technical Background)

1. Open the app and stay on the `Session` screen.
2. Press `Start session`.
3. Every time you complete a page, press `+1 page`. If you complete two pages together, press `+2 pages`.
4. When a break prompt appears, choose one of the available actions.
5. Press `End session` when you finish reading.

## Terms in Plain English

- Micro break: the shortest break prompt.
- Short break: a medium-length rest prompt.
- Long break: the longest scheduled rest prompt.
- Snooze: delay the current break prompt a little longer.
- Resume now: finish the active break and go back to reading.

## How The Flow Works

### Start

Press `Start session` once. The app begins counting pages for this reading period.

### Log Pages

Use `+1 page` or `+2 pages` as you read. The app does not require a stopwatch to know your progress.

### Handle Break Prompts

Breaks are triggered by page counts. By default, the app prompts a micro break every 2 pages, a short break every 5 pages, and a long break every 10 pages. If two break rules overlap, the app chooses the stronger one.

### Pause Or Resume

You can pause a session and resume it later. If a break was active when you paused, resuming will take you back into that break state.

### End And Save

When you press `End session`, the finished session moves into local history on this device.

## Saved Session Reminder

If the app finds an unfinished saved session when you reopen it, it can offer to resume or discard it, depending on your settings and the saved state.
