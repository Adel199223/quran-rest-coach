import type { ReaderContext } from '../domain'

export interface ReaderContextCardProps {
  context: ReaderContext | null
  trackingLabel: string
  trackingCopy: string
  simplified?: boolean
}

function buildRouteLabel(context: ReaderContext | null): string {
  if (!context) {
    return 'Local coach'
  }

  switch (context.routeKind) {
    case 'surah':
      return 'Surah view'
    case 'verse':
      return 'Verse view'
    case 'page':
      return 'Page view'
    case 'juz':
      return 'Juz view'
    case 'hizb':
      return 'Hizb view'
    case 'rub':
      return 'Rub view'
    default:
      return 'Home or non-reading view'
  }
}

function buildDetailItems(context: ReaderContext | null, simplified = false) {
  if (!context) {
    return []
  }

  const locationItems = [
    context.pageNumber ? { label: 'Page', value: String(context.pageNumber) } : null,
    context.verseKey ? { label: 'Verse', value: context.verseKey } : null,
    context.chapterId ? { label: 'Chapter', value: context.chapterId } : null,
    context.hizbNumber ? { label: 'Hizb', value: String(context.hizbNumber) } : null,
  ].filter((item): item is { label: string; value: string } => item !== null)

  if (locationItems.length === 0) {
    return []
  }

  return simplified && context.automaticTrackingAvailable
    ? locationItems
    : [{ label: 'Locale', value: context.locale }, ...locationItems]
}

export function ReaderContextCard({
  context,
  trackingLabel,
  trackingCopy,
  simplified = false,
}: ReaderContextCardProps) {
  const detailItems = buildDetailItems(context, simplified)
  const showCopy =
    trackingCopy.trim().length > 0 && !(simplified && context?.automaticTrackingAvailable)

  return (
    <section className="reader-context-card" aria-labelledby="reader-context-heading">
      <div className="reader-context-heading">
        <div>
          <p className="surface-eyebrow">Current Quran.com page</p>
          <h3 id="reader-context-heading" className="mini-heading">
            {buildRouteLabel(context)}
          </h3>
        </div>
        <span className="reader-context-badge">{trackingLabel}</span>
      </div>

      {showCopy ? <p className="reader-context-copy">{trackingCopy}</p> : null}

      {detailItems.length > 0 ? (
        <dl className="reader-context-grid">
          {detailItems.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  )
}
