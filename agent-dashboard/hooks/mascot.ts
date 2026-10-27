import type { WorkerActivity } from '../types'

import { readableColor } from './colors'
import { roleById } from './roles'

const BODY = '#f2604a'
const EYE = '#111111'
// Mid-tone gray: readable on both a white and a dark chat background.
const NEUTRAL = '#6b7280'
const GRID_W = 12
const GRID_H = 14
export const BAND_HEIGHT = 64
const MASCOT_SCALE = 4
export const MASCOT_W = GRID_W * MASCOT_SCALE
const MASCOT_H = GRID_H * MASCOT_SCALE
const BODY_TOP_ROW = 6
const BODY_ROWS = 6
const EYE_ROW = 7
const EYE_XS = [3, 8]
const CLOSED_EYE_OFFSET = 0.5
const CLOSED_EYE_HEIGHT = 0.4
const TRACK_GAP = 8
const TRACK_SPACING = 16
const TRACK_ASLEEP_OPACITY = 0.2
const TRACK_NEUTRAL_OPACITY = 0.35
const TRACK_ROLE_OPACITY = 0.45
const PACKET_SIZE = 6
const SLEEP_Z_X = 9
const SLEEP_Z_FROM_Y = 3
const SLEEP_Z_SECONDS = 2.4
const SLEEP_Z_COUNT = 2

const BAR_ROWS = 3
const BAR_CELL = 3
const BAR_GAP = 1
const BAR_PITCH = BAR_CELL + BAR_GAP
export const BAR_HEIGHT = BAR_ROWS * BAR_CELL + (BAR_ROWS - 1) * BAR_GAP
// The grid sits in a taller row; the integer offset keeps every cell on whole pixels.
export const BAR_ROW_HEIGHT = 16
const BAR_TOP = Math.floor((BAR_ROW_HEIGHT - BAR_HEIGHT) / 2)
const BAR_EMPTY_OPACITY = 0.12
// GitHub-like shades of the worker's color; a finished bar shows all of them, none dim.
const BAR_SHADES = [0.55, 0.7, 0.85, 1]
// A bar never gets wider than this many columns, however wide its slot: the SVG stays small.
export const MAX_BAR_COLUMNS = 40
// Time constant of the fill: a busy bar reaches 1 - 1/e (about 63 %) of its columns after this long.
export const BAR_FILL_SECONDS = 90
// A busy bar never claims to be done; only finishing lights the last columns.
export const BAR_MAX_PROGRESS = 0.95
const BAR_FADE_SECONDS = 0.6
const BAR_HASH_MULTIPLIER = 2654435761
const BAR_HASH_RANGE = 4294967296
const MS_PER_SECOND = 1000
// Built SVG strings are reused while their arguments repeat; the oldest go first.
const SVG_CACHE_LIMIT = 200
const barCache = new Map<string, string>()
const avatarCache = new Map<string, string>()
const bandCache = new Map<string, string>()

function memoized(cache: Map<string, string>, key: string, build: () => string): string {
  const known = cache.get(key)
  if (known !== undefined) {
    return known
  }
  const built = build()
  if (cache.size >= SVG_CACHE_LIMIT) {
    const [oldest] = cache.keys()
    if (oldest !== undefined) {
      cache.delete(oldest)
    }
  }
  cache.set(key, built)

  return built
}

/** The y of the pair of track lines: centered on the vertical middle of the body. */
export function trackYs(): { upper: number; lower: number } {
  const feetY = BAND_HEIGHT - MASCOT_H
  const bodyMiddle = feetY + (BODY_TOP_ROW + BODY_ROWS / 2) * MASCOT_SCALE

  return { upper: bodyMiddle - TRACK_SPACING / 2, lower: bodyMiddle + TRACK_SPACING / 2 }
}

// A 3x3 pixel "z" that drifts up and fades; the copies are staggered evenly.
function sleepZ(index: number): string {
  const begin = ((index * SLEEP_Z_SECONDS) / SLEEP_Z_COUNT).toFixed(2)
  const timing = `dur="${SLEEP_Z_SECONDS}s" begin="${begin}s" repeatCount="indefinite"`

  return (
    `<g fill="${NEUTRAL}" opacity="0">` +
    `<animateTransform attributeName="transform" type="translate" values="${SLEEP_Z_X} ${SLEEP_Z_FROM_Y};${SLEEP_Z_X} 0" ${timing}/>` +
    `<animate attributeName="opacity" values="0;1;1;0" ${timing}/>` +
    `<rect width="3" height="1"/><rect x="1" y="1" width="1" height="1"/><rect y="2" width="3" height="1"/>` +
    `</g>`
  )
}

function eyes(isAsleep: boolean): string {
  const y = isAsleep ? EYE_ROW + CLOSED_EYE_OFFSET : EYE_ROW
  const height = isAsleep ? CLOSED_EYE_HEIGHT : 1

  return EYE_XS.map(x => `<rect x="${x}" y="${y}" width="1" height="${height}" fill="${EYE}"/>`).join('')
}

/**
 * The Claude critter on a 12x14 grid: body rows 6-11, arms rows 8-9, eyes row 7,
 * four legs at x 2, 4, 7 and 9 on rows 12-13, the same feet on every worker.
 * `roleId` null draws it bare (the main agent). The role's overlay, the hat's
 * motion and the bob play only while busy; asleep it closes its eyes and
 * dreams of "z"; finished it just stands.
 */
export function mascot(roleId: string | null, activity: WorkerActivity): string {
  const role = roleId === null ? null : roleById(roleId)
  const isBusy = activity === 'busy'
  const isAsleep = activity === 'asleep'
  const hat = role ? `<g>${role.hat}${isBusy ? role.hatMotion : ''}</g>` : ''
  const overlay = role && isBusy ? role.overlay : ''
  const bob = isBusy
    ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 -0.5;0 0" dur="0.5s" repeatCount="indefinite"/>`
    : ''
  const dreams = isAsleep ? Array.from({ length: SLEEP_Z_COUNT }, (_, index) => sleepZ(index)).join('') : ''
  const legs = [2, 4, 7, 9]
    .map(x => `<rect x="${x}" y="12" width="1" height="2" fill="${BODY}"/>`)
    .join('')

  return (
    `<g>${bob}` +
    hat +
    overlay +
    dreams +
    `<rect x="2" y="${BODY_TOP_ROW}" width="8" height="${BODY_ROWS}" fill="${BODY}"/>` +
    `<rect x="0" y="8" width="2" height="2" fill="${BODY}"/><rect x="10" y="8" width="2" height="2" fill="${BODY}"/>` +
    eyes(isAsleep) +
    legs +
    `</g>`
  )
}

export function avatarWidth(height: number): number {
  return Math.round((height * GRID_W) / GRID_H)
}

export function avatarSvg(roleId: string, activity: WorkerActivity, height: number): string {
  return memoized(avatarCache, `${roleId}|${activity}|${height}`, () => {
    const width = avatarWidth(height)

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID_W} ${GRID_H}" width="${width}" height="${height}" shape-rendering="crispEdges">${mascot(roleId, activity)}</svg>`
  })
}

// Deterministic hash of a cell index into [0, 1).
function cellNoise(index: number): number {
  return ((Math.imul(index + 1, BAR_HASH_MULTIPLIER) >>> 0) % BAR_HASH_RANGE) / BAR_HASH_RANGE
}

function cellShade(index: number): number {
  return BAR_SHADES[Math.floor(cellNoise(index) * BAR_SHADES.length)] ?? 1
}

function barColumns(width: number): number {
  return Math.min(MAX_BAR_COLUMNS, Math.max(1, Math.floor((width + BAR_GAP) / BAR_PITCH)))
}

/** The pixel width a bar of the given slot actually draws: capped at `MAX_BAR_COLUMNS` columns. */
export function barWidth(width: number): number {
  return barColumns(width) * BAR_PITCH - BAR_GAP
}

/** The share of a busy bar that is lit after `elapsedMs`: exponential approach, capped below done. */
export function barProgress(elapsedMs: number): number {
  const elapsedSeconds = Math.max(0, elapsedMs) / MS_PER_SECOND

  return Math.min(BAR_MAX_PROGRESS, 1 - Math.exp(-elapsedSeconds / BAR_FILL_SECONDS))
}

/** Seconds of busy time at which a column lights; Infinity for the columns only finishing lights. */
export function columnFillSeconds(column: number, columns: number): number {
  const fraction = (column + 1) / columns

  return fraction > BAR_MAX_PROGRESS ? Infinity : -BAR_FILL_SECONDS * Math.log(1 - fraction)
}

function barCells(color: string, activity: WorkerActivity, columns: number, elapsedSeconds: number): string {
  let cells = ''

  for (let column = 0; column < columns; column++) {
    const fillAt = activity === 'finished' ? 0 : columnFillSeconds(column, columns)
    const isLit = fillAt <= elapsedSeconds
    // Only a busy bar animates, and only the columns still to come: lit ones start lit.
    const isFilling = activity === 'busy' && !isLit && Number.isFinite(fillAt)
    const begin = (fillAt - elapsedSeconds).toFixed(1)

    for (let row = 0; row < BAR_ROWS; row++) {
      const shade = cellShade(column * BAR_ROWS + row)
      const opacity = isLit ? shade : BAR_EMPTY_OPACITY
      const x = column * BAR_PITCH
      const y = BAR_TOP + row * BAR_PITCH
      const closing = isFilling
        ? `><animate attributeName="opacity" from="${BAR_EMPTY_OPACITY}" to="${shade}" begin="${begin}s" dur="${BAR_FADE_SECONDS}s" fill="freeze"/></rect>`
        : '/>'
      cells += `<rect x="${x}" y="${y}" width="${BAR_CELL}" height="${BAR_CELL}" fill="${color}" opacity="${opacity}"${closing}`
    }
  }

  return cells
}

/**
 * A thin pixel bar like GitHub's activity graph: a grid of identical square
 * cells in shades of the worker's color, at most `MAX_BAR_COLUMNS` wide.
 * - finished: every cell lit in its own shade;
 * - busy: fills left to right as 1 - exp(-elapsed / BAR_FILL_SECONDS), capped
 *   at `BAR_MAX_PROGRESS`. Columns already reached start lit; each later one
 *   has its own SMIL fade-in timed from `elapsedMs`, so the bar grows between
 *   redraws without any;
 * - asleep: static, the progress reached by `elapsedMs` lit and the rest dim
 *   (all dim without elapsed time).
 * `elapsedMs` counts from when the worker started; it is rounded to whole
 * seconds so repeated calls share a cached string.
 */
export function barSvg(color: string, activity: WorkerActivity, width: number, elapsedMs = 0): string {
  const columns = barColumns(width)
  const elapsedSeconds = activity === 'finished' ? 0 : Math.floor(Math.max(0, elapsedMs) / MS_PER_SECOND)

  return memoized(barCache, `${color}|${activity}|${columns}|${elapsedSeconds}`, () => {
    const cells = barCells(color, activity, columns, elapsedSeconds)

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${barWidth(width)}" height="${BAR_ROW_HEIGHT}" shape-rendering="crispEdges">${cells}</svg>`
  })
}

/**
 * The band above the prompt: the main agent at the left edge, a worker (or a
 * bare critter) at the right edge. Busy, data packets cross the whole width
 * between them; otherwise both sleep over a faint static track. It carries no
 * text, so it only changes when the worker, its state or the width does.
 */
export function bandSvg(args: { roleId: string | null; width: number; isBusy: boolean }): string {
  return memoized(bandCache, `${args.roleId}|${args.width}|${args.isBusy}`, () => buildBand(args))
}

function buildBand(args: { roleId: string | null; width: number; isBusy: boolean }): string {
  const activity: WorkerActivity = args.isBusy ? 'busy' : 'asleep'
  const color = args.roleId === null ? NEUTRAL : readableColor(roleById(args.roleId).color)
  const width = args.width
  const feetY = BAND_HEIGHT - MASCOT_H
  const from = MASCOT_W + TRACK_GAP
  const to = width - MASCOT_W - TRACK_GAP
  const { upper, lower } = trackYs()
  const packet = (begin: number, y: number, fill: string, values: string) =>
    `<rect y="${y - PACKET_SIZE / 2}" width="${PACKET_SIZE}" height="${PACKET_SIZE}" fill="${fill}"><animate attributeName="x" values="${values}" dur="2s" begin="${begin}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" dur="2s" begin="${begin}s" repeatCount="indefinite"/></rect>`
  const line = (y: number, stroke: string, opacity: number, motion = '') =>
    `<line x1="${from}" y1="${y}" x2="${to}" y2="${y}" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="2" stroke-dasharray="6 6">${motion}</line>`
  const marching = `<animate attributeName="stroke-dashoffset" values="12;0" dur="0.6s" repeatCount="indefinite"/>`
  const outgoing = [0, 0.5, 1, 1.5].map(begin => packet(begin, upper, color, `${from};${to}`)).join('')
  const incoming = [0.25, 1.25].map(begin => packet(begin, lower, NEUTRAL, `${to};${from}`)).join('')
  const track = args.isBusy
    ? line(upper, color, TRACK_ROLE_OPACITY, marching) +
      line(lower, NEUTRAL, TRACK_NEUTRAL_OPACITY) +
      outgoing +
      incoming
    : line(upper, NEUTRAL, TRACK_ASLEEP_OPACITY) + line(lower, NEUTRAL, TRACK_ASLEEP_OPACITY)

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${BAND_HEIGHT}" width="${width}" height="${BAND_HEIGHT}" shape-rendering="crispEdges">` +
    `<g transform="translate(0 ${feetY}) scale(${MASCOT_SCALE})">${mascot(null, activity)}</g>` +
    `<g transform="translate(${width - MASCOT_W} ${feetY}) scale(${MASCOT_SCALE})">${mascot(args.roleId, activity)}</g>` +
    track +
    `</svg>`
  )
}
