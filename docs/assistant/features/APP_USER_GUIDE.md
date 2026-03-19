# Quran Rest Coach User Guide

## Use This Guide When

Use this guide when someone wants a plain-language explanation of what the product does, how the standalone app and extension differ, how to load the extension, or what each screen is for without technical jargon.

## Do Not Use This Guide For

Do not use this guide for code changes, storage contracts, schema work, or debugging implementation details. Use the canonical technical docs for that.

## For Agents: Support Interaction Contract

Answer plain-language-first. Keep the explanation calm, practical, and step-by-step. If a user asks why something happened, explain the user-visible behavior first and check canonical technical docs only if the exact rule matters.

## Canonical Deference Rule

This guide explains the app simply. When details conflict, defer to `APP_KNOWLEDGE.md`, `docs/assistant/LOCAL_PERSISTENCE_KNOWLEDGE.md`, and the source code.

## Quick Start (No Technical Background)

You can use Quran Rest Coach in two ways:

1. Standalone app
   Open the local app, start a session, log pages manually, and manage breaks there.
2. Quran.com extension
   Load the extension in Chrome or Edge, open Quran.com, start a session in the side panel, and let page tracking assist you while you read.

## Loading The Extension

1. Build the project so `dist/extension` exists.
2. Open `chrome://extensions` or `edge://extensions`.
3. Turn on `Developer mode`.
4. Choose `Load unpacked`.
5. Select the `dist/extension` folder.
6. If your browser is running on Windows, you can open the same folder through `\\wsl.localhost\Ubuntu\home\fa507\dev\quran-rest-coach\dist\extension`.
7. Open Quran.com and use the Quran Rest Coach side panel.

## Terms in Plain English

- Session: one reading period that you start and end yourself.
- Side panel: the extension’s main screen inside the browser.
- Companion chip: the small Quran.com helper that appears while the extension is active.
- Break prompt: a reminder that it is a good time to rest.
- Pace hint: a gentle reminder that a break is near and your pace is running late.
- Start delay: a short countdown before the session really begins.
- Reading intent: the reading style you choose before starting, such as `Flow` or `Understand`.
- Resume anchor: a quick reminder of where to pick up after an interruption.
- Study later: save the current verse or page so you can return to it after the session, or jump into Quran.com study view later for saved verses.
- Pace score: a single score that summarizes how closely you stayed on target in pressure mode.
- Resume saved session: reopen the last unfinished session saved on this device.
- History: your completed sessions saved locally on this device.

## Main Surfaces

### Session

This is where you spend most of your time. It shows your current status, page count, next break, timer, and the next small reading step.

Before you start, you can choose a reading intent:

- `Flow` for a steady read
- `Understand` for smaller chunks with meaning checks
- `Memorize` for shorter chunks with quick review
- `Recover focus` for gentle restart sessions

If start delay is enabled, `Start session` first shows a short countdown so you can get your eyes in place before reading begins.

### History

This shows completed sessions from this device only. It helps you review duration, page count, breaks, snoozes, skipped prompts, pace score, and anything you parked to study later.

Saved items can open in two ways:

- `Open on Quran.com` to go back to the reading page
- `Open study view` for verse-based items when you want to switch into a more study-focused Quran.com page

### Settings

This lets you change pace, break timing, start delay, pressure-mode cues, and comfort options such as large text, reduced motion, high contrast, sepia mode, and soft chime prompts.

### Quran.com Companion

This is the small helper on the Quran.com page. It stays quiet most of the time, can open the side panel, and becomes more visible when a break is active or nearly due.

## Standalone App vs Extension

- Standalone app
  Best when you want a local reading coach without integrating it into Quran.com.
- Extension
  Best when you read directly on Quran.com and want automatic page tracking help plus manual correction tools.

Both versions stay local-first and use the same break logic.

## Import And Export

- The standalone app and the extension store data in different browser locations.
- Use export to save your settings, active session, history, and study-later queue to a JSON file.
- Use import in the other shell to bring that data in.

## Things To Know

- The app does not need an account.
- The app does not send your reading data to a server.
- Your data stays local in the browser or extension storage.
- The extension works only on Quran.com.
- The app is English-first today.
