import type { BreakKind } from '../domain/contracts'

export function formatClockDuration(totalSeconds: number): string {
  const normalized = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(normalized / 60)
  const seconds = normalized % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function formatApproxDuration(totalSeconds: number): string {
  const normalized = Math.max(0, Math.floor(totalSeconds))

  if (normalized < 10) {
    return 'Soon'
  }

  if (normalized < 60) {
    const roundedSeconds = Math.max(10, Math.round(normalized / 5) * 5)
    return `About ${roundedSeconds} sec`
  }

  const roundedMinutes = Math.max(1, Math.round(normalized / 60))
  return `About ${roundedMinutes} ${roundedMinutes === 1 ? 'min' : 'min'}`
}

export function formatTimeStamp(epochMs: number, locale = 'en'): string {
  const date = new Date(epochMs)
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatSessionDate(epochMs: number, locale = 'en'): string {
  const date = new Date(epochMs)
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

export function formatBreakKind(kind: BreakKind): string {
  switch (kind) {
    case 'long':
      return 'Long break'
    case 'short':
      return 'Short break'
    case 'micro':
    default:
      return 'Micro break'
  }
}

export function formatPageLabel(count: number): string {
  const normalized = Math.max(0, Math.trunc(count))
  return `${normalized} ${normalized === 1 ? 'page' : 'pages'}`
}
