import { type ChangeEvent, useState } from 'react'
import type { SettingsFormValues } from './types'
import { applyCalmFocusDefaults, applyPressureFocusDefaults } from '../app/view-model'

export interface SettingsSurfaceProps {
  values: SettingsFormValues
  onChange: (next: SettingsFormValues) => void
  onResetSettings: () => void
  defaultAdvancedTimingOpen?: boolean
}

function toNumberOrFallback(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export function SettingsSurface({
  values,
  onChange,
  onResetSettings,
  defaultAdvancedTimingOpen = false,
}: SettingsSurfaceProps) {
  const [advancedTimingOpen, setAdvancedTimingOpen] = useState(defaultAdvancedTimingOpen)

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
          Choose how the coach starts, cues, and displays your reading session.
        </p>
      </header>

      <form className="settings-form" aria-describedby="settings-note">
        <fieldset className="settings-fieldset">
          <legend>Main settings</legend>
          <p className="mini-note">
            Put the everyday options first and keep the numeric timing controls tucked away unless
            you need them.
          </p>

          <section className="settings-subsection" aria-labelledby="settings-start-heading">
            <div className="settings-subsection-header">
              <h3 id="settings-start-heading" className="settings-subsection-title">
                Start and timing cues
              </h3>
              <p className="settings-subsection-copy">
                Control when the session starts and how strongly the coach pushes the pace.
              </p>
            </div>

            <div className="settings-grid settings-grid-calm">
              <label htmlFor="pre-start-countdown-seconds">
                Start delay before reading (seconds)
                <input
                  id="pre-start-countdown-seconds"
                  type="number"
                  min={0}
                  max={60}
                  step={1}
                  value={values.preStartCountdownSeconds}
                  onChange={handleNumberChange('preStartCountdownSeconds')}
                />
                <span className="toggle-note">
                  Gives you a short setup window before the session begins. Use 0 to start
                  immediately.
                </span>
              </label>
            </div>

            <div className="toggle-grid">
              <label className="toggle-row" htmlFor="toggle-pre-start-warning-cue">
                <span className="toggle-copy">
                  <span>Play a soft cue before reading starts</span>
                  <span className="toggle-note">
                    Plays one soft beep near the end of the start delay and one when reading
                    begins.
                  </span>
                </span>
                <input
                  id="toggle-pre-start-warning-cue"
                  type="checkbox"
                  checked={values.preStartWarningCueEnabled}
                  onChange={handleToggle('preStartWarningCueEnabled')}
                />
              </label>

              <label className="toggle-row" htmlFor="toggle-between-break-countdown">
                <span className="toggle-copy">
                  <span>Show countdown while reading</span>
                  <span className="toggle-note">
                    Off keeps time approximate. On shows the exact time to the next break.
                  </span>
                </span>
                <input
                  id="toggle-between-break-countdown"
                  type="checkbox"
                  checked={values.showBetweenBreakCountdown}
                  onChange={handleToggle('showBetweenBreakCountdown')}
                />
              </label>

              <label className="toggle-row" htmlFor="toggle-reading-pressure-mode">
                <span className="toggle-copy">
                  <span>Pressure timer while reading</span>
                  <span className="toggle-note">
                    Makes the reading countdown exact and adds halfway and 10-second urgency cues.
                  </span>
                </span>
                <input
                  id="toggle-reading-pressure-mode"
                  type="checkbox"
                  checked={values.readingPressureMode}
                  onChange={handleToggle('readingPressureMode')}
                />
              </label>

              <label className="toggle-row" htmlFor="toggle-deadline-warning-cue">
                <span className="toggle-copy">
                  <span>Play a soft cue in the final 10 seconds</span>
                  <span className="toggle-note">
                    Plays one warning beep when the reading deadline reaches the final 10 seconds.
                  </span>
                </span>
                <input
                  id="toggle-deadline-warning-cue"
                  type="checkbox"
                  checked={values.deadlineWarningCueEnabled}
                  onChange={handleToggle('deadlineWarningCueEnabled')}
                />
              </label>

              <label className="toggle-row" htmlFor="toggle-rest-countdown">
                <span className="toggle-copy">
                  <span>Show countdown during breaks</span>
                  <span className="toggle-note">
                    Off uses calm status text. On shows the remaining break time.
                  </span>
                </span>
                <input
                  id="toggle-rest-countdown"
                  type="checkbox"
                  checked={values.showRestCountdown}
                  onChange={handleToggle('showRestCountdown')}
                />
              </label>

              <label className="toggle-row" htmlFor="toggle-soft-chime">
                <span className="toggle-copy">
                  <span>Play sound at break</span>
                  <span className="toggle-note">
                    Off keeps break prompts quiet. On plays a short sound when a break starts.
                  </span>
                </span>
                <input
                  id="toggle-soft-chime"
                  type="checkbox"
                  checked={values.softChime}
                  onChange={handleToggle('softChime')}
                />
              </label>
            </div>
          </section>

          <section className="settings-subsection" aria-labelledby="settings-panel-heading">
            <div className="settings-subsection-header">
              <h3 id="settings-panel-heading" className="settings-subsection-title">
                Reading panel
              </h3>
              <p className="settings-subsection-copy">
                Keep the main reading controls easy to scan and keep focus on the current session.
              </p>
            </div>

            <div className="toggle-grid">
              <label className="toggle-row" htmlFor="toggle-simplified-reading-panel">
                <span className="toggle-copy">
                  <span>Simplified reading panel</span>
                  <span className="toggle-note">
                    Shows the main reading controls first and keeps correction tools behind a
                    disclosure.
                  </span>
                </span>
                <input
                  id="toggle-simplified-reading-panel"
                  type="checkbox"
                  checked={values.simplifiedReadingPanel}
                  onChange={handleToggle('simplifiedReadingPanel')}
                />
              </label>

              <label className="toggle-row" htmlFor="toggle-resume">
                <span className="toggle-copy">
                  <span>Resume active session on reopen</span>
                  <span className="toggle-note">
                    Reopens the last local session so you can pick up where you left off.
                  </span>
                </span>
                <input
                  id="toggle-resume"
                  type="checkbox"
                  checked={values.resumeOnReopen}
                  onChange={handleToggle('resumeOnReopen')}
                />
              </label>
            </div>
          </section>

          <section className="settings-subsection" aria-labelledby="settings-display-heading">
            <div className="settings-subsection-header">
              <h3 id="settings-display-heading" className="settings-subsection-title">
                Display comfort
              </h3>
              <p className="settings-subsection-copy">
                Use these to make the app easier on your eyes without changing the Quran.com text
                itself.
              </p>
            </div>

            <div className="toggle-grid">
              <label className="toggle-row" htmlFor="toggle-large-text">
                <span className="toggle-copy">
                  <span>Large text mode</span>
                  <span className="toggle-note">
                    Increases the app text size so labels and controls are easier to scan.
                  </span>
                </span>
                <input
                  id="toggle-large-text"
                  type="checkbox"
                  checked={values.largeText}
                  onChange={handleToggle('largeText')}
                />
              </label>

              <label className="toggle-row" htmlFor="toggle-sepia">
                <span className="toggle-copy">
                  <span>Sepia comfort palette</span>
                  <span className="toggle-note">
                    Uses a softer background that can feel less bright than plain white.
                  </span>
                </span>
                <input
                  id="toggle-sepia"
                  type="checkbox"
                  checked={values.sepiaTheme}
                  onChange={handleToggle('sepiaTheme')}
                />
              </label>

              <label className="toggle-row" htmlFor="toggle-high-contrast">
                <span className="toggle-copy">
                  <span>High contrast mode</span>
                  <span className="toggle-note">
                    Increases contrast so the app is easier to read in low-light or high-glare
                    conditions.
                  </span>
                </span>
                <input
                  id="toggle-high-contrast"
                  type="checkbox"
                  checked={values.highContrast}
                  onChange={handleToggle('highContrast')}
                />
              </label>

              <label className="toggle-row" htmlFor="toggle-reduced-motion">
                <span className="toggle-copy">
                  <span>Reduced motion</span>
                  <span className="toggle-note">
                    Minimizes animation so the coach feels steadier and less distracting.
                  </span>
                </span>
                <input
                  id="toggle-reduced-motion"
                  type="checkbox"
                  checked={values.reducedMotion}
                  onChange={handleToggle('reducedMotion')}
                />
              </label>
            </div>
          </section>

          <div className="settings-actions settings-actions-split">
            <button
              type="button"
              className="action-btn action-btn-primary"
              onClick={() => onChange(applyCalmFocusDefaults(values))}
            >
              Apply calm-focus defaults
            </button>
            <button type="button" className="action-btn action-btn-soft" onClick={onResetSettings}>
              Reset settings
            </button>
          </div>
        </fieldset>

        <section className="settings-disclosure" aria-labelledby="advanced-timing-heading">
          <div className="settings-actions settings-actions-split">
            <button
              type="button"
              className="action-btn action-btn-strong"
              onClick={() => onChange(applyPressureFocusDefaults(values))}
            >
              Apply pressure-focus defaults
            </button>
          </div>
          <button
            id="advanced-timing-heading"
            type="button"
            className="settings-disclosure-trigger"
            aria-expanded={advancedTimingOpen ? 'true' : 'false'}
            onClick={() => setAdvancedTimingOpen((open) => !open)}
          >
            <span>Advanced timing</span>
            <span className="mini-note">
              {advancedTimingOpen ? 'Hide numeric timing controls' : 'Show numeric timing controls'}
            </span>
          </button>

          {advancedTimingOpen ? (
            <fieldset className="settings-fieldset settings-fieldset-advanced">
              <legend>Advanced timing</legend>
              <p className="mini-note">
                Use these when you want to fine-tune pace and break lengths page by page.
              </p>

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
          ) : null}
        </section>

        <p id="settings-note" className="mini-note">
          Settings are intended for local, personal comfort calibration.
        </p>
      </form>
    </section>
  )
}
