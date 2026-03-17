import type { SurfaceKey } from './types'

const SURFACE_LABEL: Record<SurfaceKey, string> = {
  session: 'Session',
  history: 'History',
  settings: 'Settings',
}

export interface SurfaceTabsProps {
  active: SurfaceKey
  onSelect: (surface: SurfaceKey) => void
  surfaces?: SurfaceKey[]
}

export function SurfaceTabs({
  active,
  onSelect,
  surfaces = ['session', 'history', 'settings'],
}: SurfaceTabsProps) {
  return (
    <nav className="surface-tabs" aria-label="Primary views">
      {surfaces.map((surface) => {
        const isActive = surface === active
        return (
          <button
            key={surface}
            type="button"
            className="surface-tab"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onSelect(surface)}
          >
            {SURFACE_LABEL[surface]}
          </button>
        )
      })}
    </nav>
  )
}
