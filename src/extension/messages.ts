import type {
  CoachExportData,
  ObservedReaderPage,
  ReaderContext,
  TimerSettings,
} from '../domain'

export type SessionCommand =
  | { type: 'open-side-panel' }
  | { type: 'start-session' }
  | { type: 'add-pages'; pages: number }
  | { type: 'undo-last-pages' }
  | { type: 'toggle-pause' }
  | { type: 'resume-break' }
  | { type: 'snooze-break'; seconds: number }
  | { type: 'skip-break' }
  | { type: 'end-session' }
  | { type: 'update-settings'; settings: TimerSettings }
  | { type: 'reset-settings' }
  | { type: 'reset-history' }
  | { type: 'discard-active-session' }
  | { type: 'export-data' }
  | { type: 'import-data'; payload: string }

export type ExtensionMessage =
  | {
      kind: 'reader-context:update'
      context: ReaderContext
    }
  | {
      kind: 'reader-page:observed'
      observation: ObservedReaderPage
    }
  | {
      kind: 'session-command'
      command: SessionCommand
    }

export interface ExtensionCommandResult {
  ok: boolean
  error?: string
  exportData?: CoachExportData
}
