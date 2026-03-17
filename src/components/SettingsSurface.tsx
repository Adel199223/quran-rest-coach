import type { ChangeEvent } from 'react'
import type { SettingsFormValues } from './types'

export interface SettingsSurfaceProps {
  values: SettingsFormValues
  onChange: (next: SettingsFormValues) => void
  onResetSettings: () => void
}

function toNumberOrFallback(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export function SettingsSurface({ values, onChange, onResetSettings }: SettingsSurfaceProps) {
  const handleNumberChange =
    (field: keyof SettingsFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...values,
        [field]: toNumberOrFallback(event.currentTarget.value, values[field] as number),
      })
    }

  const handleToggle =
    (field: keyof SettingsFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...values,
        [field]: event.currentTarget.checked,
      })
    }

  return (
    <section className="surface-panel settings-surface" aria-labelledby="settings-heading">
      <header className="surface-header">
        <p className="surface-eyebrow">Preferences</p>
        <h2 id="settings-heading" className="surface-title">
          Settings
        </h2>
        <p className="surface-description">
          Tune pace, break cadence, and comfort controls to match your energy.
        </p>
      </header>

      <form className="settings-form" aria-describedby="settings-note">
        <fieldset className="settings-fieldset">
          <legend>Pace and break schedule</legend>
          <div className="settings-grid">
            <label htmlFor="pace-seconds">
              Default pace for 2 pages (seconds)
              <input
                id="pace-seconds"
                type="number"
                min={30}
                step={5}
                value={values.paceSecondsPerTwoPages}
                onChange={handleNumberChange('paceSecondsPerTwoPages')}
              />
            </label>
            <label htmlFor="short-break-every">
              Short break every (pages)
              <input
                id="short-break-every"
                type="number"
                min={1}
                step={1}
                value={values.shortBreakEveryPages}
                onChange={handleNumberChange('shortBreakEveryPages')}
              />
            </label>
            <label htmlFor="short-break-seconds">
              Short break (seconds)
              <input
                id="short-break-seconds"
                type="number"
                min={5}
                step={5}
                value={values.shortBreakSeconds}
                onChange={handleNumberChange('shortBreakSeconds')}
              />
            </label>
            <label htmlFor="medium-break-every">
              Medium break every (pages)
              <input
                id="medium-break-every"
                type="number"
                min={1}
                step={1}
                value={values.mediumBreakEveryPages}
                onChange={handleNumberChange('mediumBreakEveryPages')}
              />
            </label>
            <label htmlFor="medium-break-seconds">
              Medium break (seconds)
              <input
                id="medium-break-seconds"
                type="number"
                min={10}
                step={5}
                value={values.mediumBreakSeconds}
                onChange={handleNumberChange('mediumBreakSeconds')}
              />
            </label>
            <label htmlFor="long-break-every">
              Long break every (pages)
              <input
                id="long-break-every"
                type="number"
                min={1}
                step={1}
                value={values.longBreakEveryPages}
                onChange={handleNumberChange('longBreakEveryPages')}
              />
            </label>
            <label htmlFor="long-break-seconds">
              Long break (seconds)
              <input
                id="long-break-seconds"
                type="number"
                min={15}
                step={5}
                value={values.longBreakSeconds}
                onChange={handleNumberChange('longBreakSeconds')}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="settings-fieldset">
          <legend>Comfort and reminders</legend>
          <div className="toggle-grid">
            <label className="toggle-row" htmlFor="toggle-soft-chime">
              <span>Soft chime for break prompts</span>
              <input
                id="toggle-soft-chime"
                type="checkbox"
                checked={values.softChime}
                onChange={handleToggle('softChime')}
              />
            </label>
            <label className="toggle-row" htmlFor="toggle-reduced-motion">
              <span>Reduced motion</span>
              <input
                id="toggle-reduced-motion"
                type="checkbox"
                checked={values.reducedMotion}
                onChange={handleToggle('reducedMotion')}
              />
            </label>
            <label className="toggle-row" htmlFor="toggle-large-text">
              <span>Large text mode</span>
              <input
                id="toggle-large-text"
                type="checkbox"
                checked={values.largeText}
                onChange={handleToggle('largeText')}
              />
            </label>
            <label className="toggle-row" htmlFor="toggle-high-contrast">
              <span>High contrast mode</span>
              <input
                id="toggle-high-contrast"
                type="checkbox"
                checked={values.highContrast}
                onChange={handleToggle('highContrast')}
              />
            </label>
            <label className="toggle-row" htmlFor="toggle-sepia">
              <span>Sepia comfort palette</span>
              <input
                id="toggle-sepia"
                type="checkbox"
                checked={values.sepiaTheme}
                onChange={handleToggle('sepiaTheme')}
              />
            </label>
            <label className="toggle-row" htmlFor="toggle-resume">
              <span>Resume active session on reopen</span>
              <input
                id="toggle-resume"
                type="checkbox"
                checked={values.resumeOnReopen}
                onChange={handleToggle('resumeOnReopen')}
              />
            </label>
          </div>
        </fieldset>

        <p id="settings-note" className="mini-note">
          Settings are intended for local, personal comfort calibration.
        </p>

        <div className="settings-actions">
          <button type="button" className="action-btn action-btn-soft" onClick={onResetSettings}>
            Reset settings
          </button>
        </div>
      </form>
    </section>
  )
}
