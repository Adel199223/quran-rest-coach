import { useRef } from 'react'

export interface DataTransferPanelProps {
  onExport: () => void
  onImport: (file: File) => void
  message?: string | null
  busy?: boolean
}

export function DataTransferPanel({
  onExport,
  onImport,
  message,
  busy = false,
}: DataTransferPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <section className="surface-panel data-transfer-panel" aria-labelledby="data-transfer-heading">
      <header className="surface-header">
        <p className="surface-eyebrow">Portability</p>
        <h2 id="data-transfer-heading" className="surface-title">
          Backup and import
        </h2>
        <p className="surface-description">
          Export your local settings and history, or import a saved file into this shell.
        </p>
      </header>

      <div className="session-actions data-transfer-actions" role="group" aria-label="Data tools">
        <button
          type="button"
          className="action-btn action-btn-soft"
          onClick={onExport}
          disabled={busy}
        >
          Export data
        </button>
        <button
          type="button"
          className="action-btn action-btn-soft"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          Import data
        </button>
      </div>

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="application/json"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          if (file) {
            onImport(file)
          }

          event.currentTarget.value = ''
        }}
      />

      <p className="mini-note">
        Export files stay local and can be used to move data between the standalone app and the
        extension.
      </p>

      {message ? (
        <div className="pace-hint" role="status" aria-live="polite">
          {message}
        </div>
      ) : null}
    </section>
  )
}
