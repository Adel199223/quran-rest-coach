const EN_STRINGS = {
  appTitle: 'Quran Rest Coach',
  session: 'Session',
  history: 'History',
  settings: 'Settings',
  breakDueSoon: 'Break due soon when you finish this page.',
  resumeNow: 'Resume now',
  snoozeThirty: 'Snooze 30s',
  skipOnce: 'Skip once',
  startSession: 'Start session',
  pauseSession: 'Pause',
  endSession: 'End session',
}

export type StringKey = keyof typeof EN_STRINGS

export function getStrings(locale = 'en'): typeof EN_STRINGS {
  if (locale.toLowerCase().startsWith('en')) {
    return EN_STRINGS
  }

  return EN_STRINGS
}

export function t(key: StringKey, locale = 'en'): string {
  const bundle = getStrings(locale)
  return bundle[key]
}
