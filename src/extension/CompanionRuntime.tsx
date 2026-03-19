import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { createDefaultTimerSettings } from '../domain/settings'
import type { CoachSnapshot } from '../lib/storage'
import { LocalStorageRepository } from '../lib/storage'
import { ContentCompanion } from './ContentCompanion'
import { sendExtensionMessage } from './chromeApi'
import { ChromeStorageAdapter } from './chromeStorage'
import {
  collectObservedReaderPages,
  enrichReaderContext,
  extractObservedReaderPageFromElement,
  findPrimaryObservedReaderPage,
  parseReaderContextFromUrl,
} from './quranContext'

const repository = new LocalStorageRepository(new ChromeStorageAdapter())

function createEmptySnapshot(): CoachSnapshot {
  return {
    settings: createDefaultTimerSettings(Date.now()),
    activeSession: null,
    historyEntries: [],
    readerContext: null,
    studyLaterItems: [],
  }
}

export function CompanionRuntime() {
  const [snapshot, setSnapshot] = useState<CoachSnapshot>(createEmptySnapshot)
  const [localContext, setLocalContext] = useState(() =>
    parseReaderContextFromUrl(window.location.href),
  )
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentPagesRef = useRef<Set<number>>(new Set())
  const currentSessionIdRef = useRef<string | null>(null)
  const lastContextRef = useRef('')
  const lastUrlRef = useRef(window.location.href)
  const activeSession = snapshot.activeSession

  useEffect(() => {
    let cancelled = false

    const syncSnapshot = async () => {
      const next = await repository.loadSnapshot()
      if (!cancelled) {
        setSnapshot(next)
      }
    }

    void syncSnapshot()
    const unsubscribe = repository.subscribe(() => {
      void syncSnapshot()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!activeSession || activeSession.status === 'idle') {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      void sendExtensionMessage({
        kind: 'session-command',
        command: { type: 'tick-session' },
      })
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeSession])

  useEffect(() => {
    let cancelled = false

    const syncSidePanelVisibility = async () => {
      const result = await sendExtensionMessage({
        kind: 'session-command',
        command: { type: 'get-side-panel-visibility' },
      })

      if (!cancelled && result.ok) {
        setSidePanelOpen(Boolean(result.panelOpen))
      }
    }

    void syncSidePanelVisibility()
    const intervalId = window.setInterval(() => {
      void syncSidePanelVisibility()
    }, 1000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  const sendObservedPage = useEffectEvent((element: Element) => {
    if (!snapshot.activeSession || snapshot.activeSession.status !== 'reading') {
      return
    }

    const observation = extractObservedReaderPageFromElement(element, Date.now())
    if (!observation || sentPagesRef.current.has(observation.pageNumber)) {
      return
    }

    sentPagesRef.current.add(observation.pageNumber)
    void sendExtensionMessage({
      kind: 'reader-page:observed',
      observation,
    })
  })

  const bindObserver = useEffectEvent(() => {
    observerRef.current?.disconnect()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) {
            continue
          }

          sendObservedPage(entry.target)
        }
      },
      {
        threshold: [0.6],
      },
    )

    for (const element of document.querySelectorAll('[data-page][data-verse-key], [data-page][data-chapter-id]')) {
      observer.observe(element)
    }

    observerRef.current = observer
  })

  const syncReaderContext = useEffectEvent(() => {
    const nowMs = Date.now()
    const observations = collectObservedReaderPages(document, nowMs)
    const primaryObservation = findPrimaryObservedReaderPage(document, nowMs)
    const nextContext = enrichReaderContext(
      parseReaderContextFromUrl(window.location.href, nowMs),
      observations,
      primaryObservation,
    )
    const serialized = JSON.stringify(nextContext)
    setLocalContext(nextContext)

    if (serialized !== lastContextRef.current) {
      lastContextRef.current = serialized
      void sendExtensionMessage({
        kind: 'reader-context:update',
        context: nextContext,
      })
    }

    bindObserver()

    if (activeSession?.status === 'reading') {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight
      for (const element of document.querySelectorAll('[data-page][data-verse-key], [data-page][data-chapter-id]')) {
        const rect = element.getBoundingClientRect()
        if (rect.top < viewportHeight * 0.75 && rect.bottom > viewportHeight * 0.2) {
          sendObservedPage(element)
        }
      }
    }
  })

  useEffect(() => {
    if (activeSession?.sessionId !== currentSessionIdRef.current) {
      currentSessionIdRef.current = activeSession?.sessionId ?? null
      sentPagesRef.current = new Set()
      syncReaderContext()
    }
  }, [activeSession?.sessionId])

  useEffect(() => {
    syncReaderContext()

    const mutationObserver = new MutationObserver(() => {
      window.requestAnimationFrame(() => {
        syncReaderContext()
      })
    })

    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-page', 'data-verse-key', 'data-chapter-id', 'data-hizb'],
    })

    const urlInterval = window.setInterval(() => {
      if (window.location.href !== lastUrlRef.current) {
        lastUrlRef.current = window.location.href
        syncReaderContext()
      }
    }, 700)

    return () => {
      mutationObserver.disconnect()
      observerRef.current?.disconnect()
      window.clearInterval(urlInterval)
    }
  }, [])

  const readerContext = snapshot.readerContext ?? localContext

  return (
    <ContentCompanion
      activeSession={activeSession}
      onOpenPanel={() => {
        void sendExtensionMessage({
          kind: 'session-command',
          command: { type: 'open-side-panel' },
        })
      }}
      onResumeBreak={() => {
        void sendExtensionMessage({
          kind: 'session-command',
          command: { type: 'resume-break' },
        })
      }}
      onSkipBreak={() => {
        void sendExtensionMessage({
          kind: 'session-command',
          command: { type: 'skip-break' },
        })
      }}
      onSnoozeBreak={() => {
        void sendExtensionMessage({
          kind: 'session-command',
          command: { type: 'snooze-break', seconds: 30 },
        })
      }}
      readerContext={readerContext}
      settings={snapshot.settings}
      suppressExpandedPrompt={sidePanelOpen}
    />
  )
}
