import type { ReaderContext } from '../domain'

export interface ReaderContextCardProps {
  context: ReaderContext | null
  trackingLabel: string
  trackingCopy: string
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
      return 'Unknown Quran.com view'
  }
}

export function ReaderContextCard({
  context,
  trackingLabel,
  trackingCopy,
}: ReaderContextCardProps) {
  return (
    <section className="reader-context-card" aria-labelledby="reader-context-heading">
      <div className="reader-context-heading">
        <div>
          <p className="surface-eyebrow">Reader context</p>
          <h3 id="reader-context-heading" className="mini-heading">
            {buildRouteLabel(context)}
          </h3>
        </div>
        <span className="reader-context-badge">{trackingLabel}</span>
      </div>

      <p className="reader-context-copy">{trackingCopy}</p>

      <dl className="reader-context-grid">
        <div>
          <dt>Locale</dt>
          <dd>{context?.locale ?? 'en'}</dd>
        </div>
        <div>
          <dt>Chapter</dt>
          <dd>{context?.chapterId ?? '--'}</dd>
        </div>
        <div>
          <dt>Verse</dt>
          <dd>{context?.verseKey ?? '--'}</dd>
        </div>
        <div>
          <dt>Page</dt>
          <dd>{context?.pageNumber ?? '--'}</dd>
        </div>
      </dl>
    </section>
  )
}
