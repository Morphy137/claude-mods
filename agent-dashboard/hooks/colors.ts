const HEX_COLOR = /^#([0-9a-f]{6})$/i
const HEX_RADIX = 16
const HEX_DIGITS_PER_CHANNEL = 2
const MAX_CHANNEL = 255
const LINEAR_CUTOFF = 0.03928
const LINEAR_DIVISOR = 12.92
const GAMMA_OFFSET = 0.055
const GAMMA_SCALE = 1.055
const GAMMA = 2.4
const WEIGHTS = [0.2126, 0.7152, 0.0722]
const CHANNEL_INDEXES = [0, 1, 2]
const FALLBACK_LUMINANCE = 0.5
const STEP = 0.9
const MAX_STEPS = 24
// Relative luminance band that keeps at least 3:1 contrast against both white
// (L <= 0.30) and a dark chat background of about #1e1e1e (L >= 0.14).
export const MAX_LUMINANCE = 0.3
export const MIN_LUMINANCE = 0.14

type Rgb = [number, number, number]

function parse(color: string): Rgb | null {
  const match = HEX_COLOR.exec(color)
  if (!match?.[1]) {
    return null
  }
  const digits = match[1]

  return CHANNEL_INDEXES.map(index =>
    parseInt(digits.slice(index * HEX_DIGITS_PER_CHANNEL, (index + 1) * HEX_DIGITS_PER_CHANNEL), HEX_RADIX),
  ) as Rgb
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map(value => Math.round(value).toString(HEX_RADIX).padStart(HEX_DIGITS_PER_CHANNEL, '0')).join('')}`
}

function linear(channel: number): number {
  const value = channel / MAX_CHANNEL

  return value <= LINEAR_CUTOFF ? value / LINEAR_DIVISOR : ((value + GAMMA_OFFSET) / GAMMA_SCALE) ** GAMMA
}

/** WCAG relative luminance of `#rrggbb`; a middling value for anything else. */
export function luminance(color: string): number {
  const rgb = parse(color)
  if (!rgb) {
    return FALLBACK_LUMINANCE
  }

  return rgb.reduce((sum, channel, index) => sum + linear(channel) * (WEIGHTS[index] ?? 0), 0)
}

/**
 * The same hue pulled into the luminance band that stays readable on a white
 * and on a dark background; colors already inside the band are returned as is.
 */
export function readableColor(color: string): string {
  let rgb = parse(color)
  if (!rgb) {
    return color
  }
  for (let step = 0; step < MAX_STEPS && luminance(toHex(rgb)) > MAX_LUMINANCE; step += 1) {
    rgb = rgb.map(channel => channel * STEP) as Rgb
  }
  for (let step = 0; step < MAX_STEPS && luminance(toHex(rgb)) < MIN_LUMINANCE; step += 1) {
    rgb = rgb.map(channel => channel + (MAX_CHANNEL - channel) * (1 - STEP)) as Rgb
  }

  return toHex(rgb)
}

