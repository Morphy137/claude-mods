export function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

const COUNT_UNITS: Array<[string, number]> = [
  ['T', 1e12],
  ['B', 1e9],
  ['M', 1e6],
  ['K', 1e3],
]
const SIGNIFICANT_DIGITS = 3
const TRAILING_ZEROS = /\.?0+$/

/** 2274000 becomes "2.27M": three significant digits and an English suffix (K, M, B, T). */
export function formatCount(value: number): string {
  const rounded = Math.round(Math.max(0, value))
  const index = COUNT_UNITS.findIndex(([, size]) => rounded >= size)
  if (index < 0) {
    return String(rounded)
  }
  const [suffix, size] = COUNT_UNITS[index] as [string, number]
  const scaled = rounded / size
  const decimals = Math.max(0, SIGNIFICANT_DIGITS - String(Math.floor(scaled)).length)
  const shown = scaled.toFixed(decimals)
  // 999,999 would round to "1000K": the next unit up reads it as "1M".
  const larger = COUNT_UNITS[index - 1]
  if (Number(shown) >= 1000 && larger) {
    return `${Number((rounded / larger[1]).toFixed(2))}${larger[0]}`
  }

  // Only decimals lose their trailing zeros: "100" must stay 100.
  return `${shown.includes('.') ? shown.replace(TRAILING_ZEROS, '') : shown}${suffix}`
}

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const pad = (value: number) => String(value).padStart(2, '0')

/** A span as people read it: "45s", "12m", "3h 05m", "2d 4h". */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / MS_PER_SECOND)
  if (totalSeconds < SECONDS_PER_MINUTE) {
    return `${totalSeconds}s`
  }
  const totalMinutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const totalHours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
  const days = Math.floor(totalHours / HOURS_PER_DAY)
  if (days > 0) {
    return `${days}d ${totalHours % HOURS_PER_DAY}h`
  }
  if (totalHours > 0) {
    return `${totalHours}h ${pad(totalMinutes % MINUTES_PER_HOUR)}m`
  }

  return `${totalMinutes}m`
}
