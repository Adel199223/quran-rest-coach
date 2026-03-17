import type { ActiveSession, BreakTier, HybridNudge, TimerSettings } from './contracts'
import { normalizeBreakTiers } from './settings'

export interface BreakDecision {
  kind: BreakTier['kind']
  triggerEveryPages: number
  durationSeconds: number
}

export interface NextBreakHint extends BreakDecision {
  triggerPage: number
  pagesUntilBreak: number
}

const SEARCH_LIMIT_PAGES = 1000
const NUDGE_THRESHOLD_MULTIPLIER = 1.1

export function resolveBreakForPageCount(
  totalPages: number,
  tiersInput: BreakTier[],
): BreakDecision | null {
  if (!Number.isInteger(totalPages) || totalPages <= 0) {
    return null
  }

  const tiers = normalizeBreakTiers(tiersInput)

  for (const tier of tiers) {
    if (totalPages % tier.everyPages === 0) {
      return {
        kind: tier.kind,
        triggerEveryPages: tier.everyPages,
        durationSeconds: tier.durationSeconds,
      }
    }
  }

  return null
}

export function getNextBreakHint(
  totalPages: number,
  tiersInput: BreakTier[],
): NextBreakHint | null {
  const tiers = normalizeBreakTiers(tiersInput)

  if (tiers.length === 0) {
    return null
  }

  const startPages = Math.max(0, Math.trunc(totalPages))
  for (let offset = 1; offset <= SEARCH_LIMIT_PAGES; offset += 1) {
    const triggerPage = startPages + offset
    const decision = resolveBreakForPageCount(triggerPage, tiers)
    if (decision) {
      return {
        ...decision,
        triggerPage,
        pagesUntilBreak: offset,
      }
    }
  }

  return null
}

export function computeHybridNudge(
  session: ActiveSession,
  settings: TimerSettings,
  nowMs: number,
): HybridNudge | null {
  if (session.status !== 'reading') {
    return null
  }

  const hint = getNextBreakHint(session.totalPages, settings.breakTiers)
  if (!hint || hint.pagesUntilBreak !== 1) {
    return null
  }

  const expectedMsPerPage = (settings.paceSecondsPerTwoPages * 1000) / 2
  const thresholdMs = Math.round(expectedMsPerPage * NUDGE_THRESHOLD_MULTIPLIER)
  const referenceTimeMs = session.lastPageLoggedAtMs ?? session.startedAtMs
  const elapsedMs = Math.max(0, nowMs - referenceTimeMs)

  if (elapsedMs < thresholdMs) {
    return null
  }

  const overdueSeconds = Math.floor((elapsedMs - thresholdMs) / 1000)
  return {
    message: 'Break due soon when you finish this page.',
    overdueSeconds,
    pagesUntilBreak: hint.pagesUntilBreak,
  }
}
