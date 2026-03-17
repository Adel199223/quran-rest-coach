# Quran Rest Coach User Guide

## Use This Guide When

Use this guide when someone wants a plain-language explanation of what the app does, what each screen is for, or how to complete a normal reading session without technical jargon.

## Do Not Use This Guide For

Do not use this guide for code changes, storage contracts, schema work, or debugging implementation details. Use the canonical technical docs for that.

## For Agents: Support Interaction Contract

Answer plain-language-first. Keep the explanation calm, practical, and step-by-step. If a user asks why something happened, explain the user-visible behavior first and check canonical technical docs only if the exact rule matters.

## Canonical Deference Rule

This guide explains the app simply. When details conflict, defer to `APP_KNOWLEDGE.md`, `docs/assistant/LOCAL_PERSISTENCE_KNOWLEDGE.md`, and the source code.

## Quick Start (No Technical Background)

1. Open the app.
2. Go to the `Session` screen.
3. Press `Start session`.
4. Each time you finish a page, press `+1 page`. If you finished two pages, press `+2 pages`.
5. When a rest prompt appears, you can take the break, snooze it, or skip it.
6. Press `End session` when you are done. The finished session moves into local history on this device.

## Terms in Plain English

- Session: one reading period that you start and end yourself.
- Break prompt: a screen that appears when the app thinks it is a good time to rest.
- Pace hint: a gentle reminder that your reading is moving slower than the current pace target.
- Resume saved session: reopen the last unfinished session that was saved on this device.
- History: your completed sessions saved locally in the browser.

## Main Screens

### Session

This is where you spend most of your time. It shows your current status, page count, the next break, and the estimated time until the next break.

### History

This screen shows completed sessions from this device only. It helps you review duration, page count, breaks, snoozes, and skipped prompts.

### Settings

This screen lets you change pace, break timing, and comfort options such as large text, reduced motion, high contrast, sepia mode, and soft chime prompts.

## Things To Know

- The app does not need an account.
- The app does not send your reading data to a server.
- Your session, history, and settings are stored locally in your browser.
- The app is English-first today.
