import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CompanionRuntime } from './CompanionRuntime'

const COMPANION_STYLES = `
  :host {
    all: initial;
  }

  .qrc-companion {
    position: fixed;
    inset-inline-end: 16px;
    inset-block-end: 16px;
    z-index: 2147483646;
    display: grid;
    gap: 10px;
    font-family: "Lexend", "Segoe UI", sans-serif;
    color: #163327;
  }

  .qrc-chip {
    appearance: none;
    border: 1px solid rgba(38, 103, 77, 0.22);
    background: linear-gradient(135deg, #fffefa 0%, #eef7f1 100%);
    color: inherit;
    border-radius: 999px;
    padding: 12px 16px;
    min-inline-size: 220px;
    box-shadow: 0 14px 30px -24px rgba(15, 41, 31, 0.55);
    display: grid;
    gap: 2px;
    text-align: start;
    cursor: pointer;
  }

  .qrc-chip-title {
    font-size: 13px;
    font-weight: 800;
    line-height: 1.2;
  }

  .qrc-chip-subtitle {
    font-size: 12px;
    color: #567267;
    line-height: 1.2;
  }

  .qrc-toast {
    inline-size: min(300px, calc(100vw - 32px));
    border: 1px solid rgba(38, 103, 77, 0.2);
    background: #fffefa;
    border-radius: 18px;
    padding: 14px;
    box-shadow: 0 24px 38px -28px rgba(15, 41, 31, 0.5);
    display: grid;
    gap: 10px;
  }

  .qrc-toast-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .qrc-toast-kicker {
    margin: 0;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #567267;
    font-weight: 800;
  }

  .qrc-toast-title {
    margin: 0;
    font-size: 18px;
    line-height: 1.1;
  }

  .qrc-toast-copy {
    margin: 0;
    font-size: 13px;
    color: #4f675d;
    line-height: 1.4;
  }

  .qrc-toast-actions {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .qrc-action,
  .qrc-link {
    appearance: none;
    border: 1px solid rgba(38, 103, 77, 0.2);
    background: #eef6f1;
    color: #153025;
    border-radius: 999px;
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .qrc-action-primary {
    background: linear-gradient(135deg, #1f7a5f 0%, #2f8c70 100%);
    color: #f8fdf9;
    border-color: transparent;
  }

  .qrc-link {
    background: transparent;
  }

  @media (max-width: 700px) {
    .qrc-companion {
      inset-inline: 12px;
      inset-block-end: 12px;
    }

    .qrc-chip,
    .qrc-toast {
      inline-size: 100%;
      min-inline-size: 0;
    }

    .qrc-toast-actions {
      grid-template-columns: 1fr;
    }
  }
`

function mountCompanion() {
  const existingHost = document.getElementById('qrc-content-root')
  if (existingHost) {
    return true
  }

  if (!document.body) {
    return false
  }

  const host = document.createElement('div')
  host.id = 'qrc-content-root'
  document.body.append(host)

  const shadowRoot = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = COMPANION_STYLES
  const mountNode = document.createElement('div')
  shadowRoot.append(style, mountNode)

  createRoot(mountNode).render(
    <StrictMode>
      <CompanionRuntime />
    </StrictMode>,
  )

  return true
}

let mountObserver: MutationObserver | null = null
let mountIntervalId: number | null = null

function stopMountWatchers() {
  mountObserver?.disconnect()
  mountObserver = null

  if (mountIntervalId !== null) {
    window.clearInterval(mountIntervalId)
    mountIntervalId = null
  }
}

function ensureCompanionMounted() {
  if (mountCompanion()) {
    stopMountWatchers()
    return
  }

  if (!mountObserver && document.documentElement) {
    mountObserver = new MutationObserver(() => {
      if (mountCompanion()) {
        stopMountWatchers()
      }
    })

    mountObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    })
  }

  if (mountIntervalId === null) {
    mountIntervalId = window.setInterval(() => {
      if (mountCompanion()) {
        stopMountWatchers()
      }
    }, 250)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureCompanionMounted, { once: true })
} else {
  ensureCompanionMounted()
}
