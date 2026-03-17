# Quran Rest Coach

Local-first Quran reading interval app for dyslexia-aware, ADHD-considerate pacing.

## Run

Use the WSL-safe wrapper commands from this environment:

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm install"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run dev"
```

Open: [http://127.0.0.1:4173](http://127.0.0.1:4173)

## Validate

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm test"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run lint"
wsl.exe bash -lc "cd /home/fa507/dev/quran-rest-coach && npm run build"
```

## Assistant Docs

- Canonical architecture/status: `APP_KNOWLEDGE.md`
- Assistant runbook: `agent.md`
- Compatibility shim: `AGENTS.md`
- Assistant docs index: `docs/assistant/INDEX.md`
- App user guide: `docs/assistant/features/APP_USER_GUIDE.md`
- Reading-session guide: `docs/assistant/features/READING_SESSION_USER_GUIDE.md`

## Product Snapshot

- `Session`: start, log pages, pause/resume, break prompts, hybrid pace hints
- `History`: completed local sessions
- `Settings`: pace, break tiers, comfort toggles, resume behavior

No backend is required in v1. Browser storage is the only persistence layer.
