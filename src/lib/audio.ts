export interface SoftChimeOptions {
  volume?: number
  frequencyHz?: number
  durationMs?: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function canPlaySoftChime(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return typeof window.AudioContext !== 'undefined'
}

export async function playSoftChime(options: SoftChimeOptions = {}): Promise<void> {
  if (!canPlaySoftChime()) {
    return
  }

  const AudioContextImpl = window.AudioContext
  const context = new AudioContextImpl()
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()

  const volume = clamp(options.volume ?? 0.03, 0.001, 0.25)
  const frequencyHz = clamp(options.frequencyHz ?? 432, 110, 880)
  const durationMs = clamp(options.durationMs ?? 280, 100, 1200)
  const now = context.currentTime
  const releaseSeconds = durationMs / 1000

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequencyHz, now)
  gainNode.gain.setValueAtTime(volume, now)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + releaseSeconds)

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + releaseSeconds)

  await new Promise<void>((resolve) => {
    oscillator.onended = () => {
      void context.close().then(() => resolve())
    }
  })
}
