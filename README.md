# Quran Rest Coach

Local-first Quran reading coach with two shells:

- a standalone React/Vite web app
- a Chrome/Edge MV3 extension built for [Quran.com](https://quran.com)

## Standalone App

Use the WSL-safe wrapper commands from this environment:

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm install"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run dev"
```

Open: [http://127.0.0.1:4173](http://127.0.0.1:4173)

## Browser Extension

Build the standalone app and the MV3 extension bundle together:

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run build"
```

Load the unpacked extension from `dist/extension`:

1. Open `chrome://extensions` or `edge://extensions`
2. Enable `Developer mode`
3. Choose `Load unpacked`
4. Select `/home/fa507/dev/quran-rest-coach/dist/extension`
5. If you are loading it from Windows Chrome or Edge, the same folder is available as `\\wsl.localhost\Ubuntu\home\fa507\dev\quran-rest-coach\dist\extension`
6. Open [Quran.com](https://quran.com) and launch the side panel

## How It Works

- Shared domain logic lives in `src/domain/`
- Shared session/history/settings UI lives in `src/app/` and `src/components/`
- The standalone shell lives in `src/App.tsx`
- The extension side panel lives in `src/extension/SidePanelApp.tsx`
- The Quran.com content script lives in `src/extension/content.tsx`
- The extension background service worker lives in `src/extension/background.ts`

The extension reads stable Quran.com metadata from `data-page`, `data-verse-key`, `data-chapter-id`, and `data-hizb`. It does not depend on private APIs or fragile CSS-module selectors.

## Quran.com Tracking Rules

- Sessions still start explicitly. Navigation alone does not auto-start a session.
- Each distinct observed Quran.com page counts once per session.
- Seeing the same page again does not increment progress.
- Scrolling backward does not remove progress.
- Jumping forward counts only pages that were actually observed, not inferred skipped pages.
- Manual `+1`, `+2`, and `Undo` controls stay available for correction and fallback.

## Data Portability

- The standalone app stores locally in browser `localStorage`
- The extension stores locally in `chrome.storage.local`
- Neither shell can read the other storage directly
- Use built-in export/import JSON to move settings, active sessions, and history between shells

## Validate

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm test"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run lint"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run build"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:ui"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run validate:extension"
```

`npm run validate:ui` validates the standalone app and writes artifacts to `output/playwright/`.

`npm run validate:extension` runs the repo-owned live Quran.com smoke against the unpacked MV3 bundle in `dist/extension` and writes its summary plus extension screenshots to `output/playwright/`.

## Assistant Docs

- Canonical architecture and status: `APP_KNOWLEDGE.md`
- Assistant runbook: `agent.md`
- Compatibility shim: `AGENTS.md`
- Assistant docs index: `docs/assistant/INDEX.md`
- App user guide: `docs/assistant/features/APP_USER_GUIDE.md`
- Reading-session guide: `docs/assistant/features/READING_SESSION_USER_GUIDE.md`
