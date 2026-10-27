import { expect, test } from 'claude-code/testing'

import {
  BAND_HEIGHT,
  BAR_FILL_SECONDS,
  BAR_HEIGHT,
  BAR_MAX_PROGRESS,
  BAR_ROW_HEIGHT,
  MAX_BAR_COLUMNS,
  avatarSvg,
  bandSvg,
  barProgress,
  barSvg,
  barWidth,
  columnFillSeconds,
  mascot,
  spriteFor,
  trackYs,
} from './mascot'
import { ROLES } from './roles'

const FEET_Y = 8
// Body rows 6-11 of the 14-row grid at scale 4: the middle sits on grid row 9.
const BODY_MIDDLE_Y = FEET_Y + 9 * 4
const WIDTH = 600
const BAR_WIDTH = 300
const COLOR = '#8b5cf6'
const CLOSED_EYE = 'height="0.4"'
const BOB = 'values="0 0;0 -0.5;0 0"'
const MASCOTS_IN_BAND = 2
const EYES_PER_MASCOT = 2

const count = (text: string, part: string) => text.split(part).length - 1

test('the track lines are centered on the vertical middle of the mascots body', () => {
  const { upper, lower } = trackYs()

  expect((upper + lower) / 2).toBe(BODY_MIDDLE_Y)
  expect(upper).toBeLessThan(lower)
  expect(lower).toBeLessThan(BAND_HEIGHT)
  const svg = bandSvg({ roleId: 'architect', width: WIDTH, isBusy: true, mainSeed: 'session', workerSeed: 'worker' })
  expect(svg).toContain(`y1="${upper}" x2=`)
  expect(svg).toContain(`y1="${lower}" x2=`)
})

test('a busy band animates packets and the dashed line, with no light-on-dark colors', () => {
  const svg = bandSvg({ roleId: 'architect', width: WIDTH, isBusy: true, mainSeed: 'session', workerSeed: 'worker' })

  expect(svg).toContain('attributeName="x"')
  expect(svg).toContain('stroke-dashoffset')
  // Characters may wear white; the track and packets must not.
  expect(svg).not.toContain('stroke="#ffffff"')
})

test('an asleep band has no packets, no moving line and sleeping mascots', () => {
  const svg = bandSvg({ roleId: 'architect', width: WIDTH, isBusy: false, mainSeed: 'session', workerSeed: 'worker' })

  expect(svg).not.toContain('attributeName="x"')
  expect(svg).not.toContain('stroke-dashoffset')
  expect(svg).not.toContain(BOB)
  expect(count(svg, CLOSED_EYE)).toBe(MASCOTS_IN_BAND * EYES_PER_MASCOT)
  expect(svg).toContain('<line')
})

test('a band without a worker draws two bare sleeping mascots', () => {
  const svg = bandSvg({ roleId: null, width: WIDTH, isBusy: false, mainSeed: 'session', workerSeed: 'worker' })

  expect(count(svg, CLOSED_EYE)).toBe(MASCOTS_IN_BAND * EYES_PER_MASCOT)
})

test('busy mascots move, asleep ones close their eyes and drift z diagonally, finished ones sleep still', () => {
  const busy = mascot('builder', 'busy', 'seed')
  const asleep = mascot('builder', 'asleep', 'seed')
  const finished = mascot('builder', 'finished', 'seed')

  expect(busy).toContain('<animate')
  expect(asleep).toContain(CLOSED_EYE)
  // The z rises as far as it moves right.
  expect(asleep).toContain('type="translate" values="12 5;15 2"')
  expect(finished).toContain(CLOSED_EYE)
  expect(finished).not.toContain('<animate')
})

test('every role has ten characters, picked stably by seed', () => {
  for (const role of ROLES) {
    const names = new Set(Array.from({ length: 200 }, (_, index) => spriteFor(role.id, `agent-${index}`).name))
    expect(names.size).toBe(10)
    expect(spriteFor(role.id, 'same').name).toBe(spriteFor(role.id, 'same').name)
  }
})

test('effects only play while busy; still parts stay drawn when asleep', () => {
  for (const role of ROLES) {
    for (let index = 0; index < 40; index++) {
      const seed = `agent-${index}`
      expect(mascot(role.id, 'asleep', seed)).not.toContain('type="rotate"')
      expect(mascot(role.id, 'finished', seed)).not.toContain('<animate')
    }
  }
})

const BAR_CELL = 3
const BAR_GAP = 1
const BAR_ROWS = 3
const BAR_EMPTY = 0.12
const MS_PER_SECOND = 1000
const FILLING_ELAPSED_MS = 30 * MS_PER_SECOND
const WIDE_SLOT = 2000
const BEGIN_TOLERANCE_SECONDS = 0.1
const MANY_BARS = 250
const PROGRESS_TOLERANCE = 1e-9
const barColumns = (width: number) => Math.min(MAX_BAR_COLUMNS, Math.floor((width + BAR_GAP) / (BAR_CELL + BAR_GAP)))
const rects = (svg: string) => svg.match(/<rect [^>]*>/g) ?? []

type BarCell = { x: number; opacity: number; begin?: number }

function cellsOf(svg: string): BarCell[] {
  const pattern = /<rect x="(\d+)"[^>]*? opacity="([\d.]+)"(?:\/>|><animate [^>]*?begin="(-?[\d.]+)s"[^>]*\/><\/rect>)/g

  return [...svg.matchAll(pattern)].map(([, x, opacity, begin]) => ({
    x: Number(x),
    opacity: Number(opacity),
    begin: begin === undefined ? undefined : Number(begin),
  }))
}

/** One entry per column: its three cells. */
function columnsOf(svg: string): BarCell[][] {
  const cells = cellsOf(svg)
  const columns: BarCell[][] = []
  for (let index = 0; index < cells.length; index += BAR_ROWS) {
    columns.push(cells.slice(index, index + BAR_ROWS))
  }

  return columns
}

// Columns of a BAR_WIDTH slot: bars span their whole slot now.
const COLUMNS = Math.floor((BAR_WIDTH + 1) / 4)
const isLitColumn = (column: BarCell[]) => column.every(cell => cell.opacity > BAR_EMPTY)

test('the bar is a 3-row grid of equal square cells with a 1 px gap', () => {
  expect(BAR_HEIGHT).toBe(BAR_ROWS * BAR_CELL + (BAR_ROWS - 1) * BAR_GAP)
  expect(BAR_ROW_HEIGHT).toBeGreaterThan(BAR_HEIGHT)
  for (const activity of ['busy', 'asleep', 'finished'] as const) {
    const svg = barSvg(COLOR, activity, BAR_WIDTH)
    const cells = rects(svg)
    const columns = barColumns(BAR_WIDTH)
    const usedWidth = columns * (BAR_CELL + BAR_GAP) - BAR_GAP

    expect(cells.length).toBe(columns * BAR_ROWS)
    expect(count(svg, `width="${BAR_CELL}" height="${BAR_CELL}"`)).toBe(cells.length)
    expect(svg).toContain(`width="${usedWidth}" height="${BAR_ROW_HEIGHT}"`)
    expect(barWidth(BAR_WIDTH)).toBe(usedWidth)
    expect(usedWidth).toBeLessThanOrEqual(BAR_WIDTH)
    expect(svg).toContain('shape-rendering="crispEdges"')
    expect(new Set(cells.map(cell => cell.match(/ y="(\d+)"/)?.[1])).size).toBe(BAR_ROWS)
    for (const cell of cells) {
      const y = Number(cell.match(/ y="(\d+)"/)?.[1])
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y + BAR_CELL).toBeLessThanOrEqual(BAR_ROW_HEIGHT)
    }
  }
})

test('the bar column count follows the width, never drops below one and is capped', () => {
  expect(rects(barSvg(COLOR, 'finished', 40)).length).toBe(barColumns(40) * BAR_ROWS)
  expect(rects(barSvg(COLOR, 'finished', 1)).length).toBe(BAR_ROWS)
  for (const activity of ['busy', 'asleep', 'finished'] as const) {
    expect(rects(barSvg(COLOR, activity, WIDE_SLOT)).length).toBe(MAX_BAR_COLUMNS * BAR_ROWS)
  }
  expect(barWidth(WIDE_SLOT)).toBe(MAX_BAR_COLUMNS * (BAR_CELL + BAR_GAP) - BAR_GAP)
  expect(barSvg(COLOR, 'finished', WIDE_SLOT)).toContain(`width="${barWidth(WIDE_SLOT)}" height="${BAR_ROW_HEIGHT}"`)
})

test('a finished bar is fully lit, every cell in its own shade, none dim', () => {
  for (const color of [COLOR, '#dc2626']) {
    const svg = barSvg(color, 'finished', BAR_WIDTH, FILLING_ELAPSED_MS)
    const opacities = cellsOf(svg).map(cell => cell.opacity)

    expect(opacities.length).toBe(barColumns(BAR_WIDTH) * BAR_ROWS)
    expect(Math.min(...opacities)).toBeGreaterThan(BAR_EMPTY)
    expect(new Set(opacities).size).toBeGreaterThanOrEqual(2)
    expect(svg).not.toContain('<animate')
    expect(svg).toContain(`fill="${color}"`)
  }
})

test('the fill follows an exponential approach that never reaches done while busy', () => {
  expect(barProgress(0)).toBe(0)
  expect(Math.abs(barProgress(BAR_FILL_SECONDS * MS_PER_SECOND) - (1 - Math.exp(-1)))).toBeLessThan(PROGRESS_TOLERANCE)
  expect(barProgress(Number.MAX_SAFE_INTEGER)).toBe(BAR_MAX_PROGRESS)
  expect(barProgress(-5)).toBe(0)
  expect(columnFillSeconds(0, MAX_BAR_COLUMNS)).toBeGreaterThan(0)
  expect(columnFillSeconds(MAX_BAR_COLUMNS - 1, MAX_BAR_COLUMNS)).toBe(Infinity)
  // A column lights exactly when the progress reaches its share.
  const column = 9
  const at = columnFillSeconds(column, MAX_BAR_COLUMNS)
  expect(Math.abs(barProgress(at * MS_PER_SECOND) - (column + 1) / MAX_BAR_COLUMNS)).toBeLessThan(PROGRESS_TOLERANCE)
})

test('a busy bar lights a prefix matching its progress and fades the rest in on schedule', () => {
  const svg = barSvg(COLOR, 'busy', BAR_WIDTH, FILLING_ELAPSED_MS)
  const columns = columnsOf(svg)
  const litCount = columns.filter(isLitColumn).length
  const reachable = columns.filter((_, index) => Number.isFinite(columnFillSeconds(index, COLUMNS)))

  expect(columns.length).toBe(COLUMNS)
  expect(litCount).toBe(Math.floor(barProgress(FILLING_ELAPSED_MS) * COLUMNS))
  expect(columns.slice(0, litCount).every(isLitColumn)).toBe(true)
  // Every column still to come, up to the cap, has one fade per cell, due when its fraction is reached.
  expect(count(svg, '<animate ')).toBe((reachable.length - litCount) * BAR_ROWS)
  columns.slice(litCount).forEach((column, offset) => {
    const index = litCount + offset
    const fillAt = columnFillSeconds(index, COLUMNS)
    for (const cell of column) {
      expect(cell.opacity).toBe(BAR_EMPTY)
      if (Number.isFinite(fillAt)) {
        expect(Math.abs((cell.begin ?? NaN) - (fillAt - FILLING_ELAPSED_MS / MS_PER_SECOND))).toBeLessThan(
          BEGIN_TOLERANCE_SECONDS,
        )
      } else {
        expect(cell.begin).toBeUndefined()
      }
    }
  })
  const begins = columns.slice(litCount, reachable.length).map(column => column[0]?.begin ?? Infinity)
  expect(begins).toEqual([...begins].sort((a, b) => a - b))
  expect(begins.every(begin => begin > 0)).toBe(true)
  expect(svg).toContain('fill="freeze"')
})

test('a fresh busy bar starts dim and a long-busy one stops short of full', () => {
  const fresh = columnsOf(barSvg(COLOR, 'busy', BAR_WIDTH, 0))
  expect(fresh.filter(isLitColumn)).toHaveLength(0)

  const longBusy = 100 * BAR_FILL_SECONDS * MS_PER_SECOND
  const late = columnsOf(barSvg(COLOR, 'busy', BAR_WIDTH, longBusy))
  const lit = late.filter(isLitColumn).length
  expect(lit).toBe(Math.floor(BAR_MAX_PROGRESS * COLUMNS))
  expect(lit).toBeLessThan(COLUMNS)
  expect(barSvg(COLOR, 'busy', BAR_WIDTH, longBusy)).not.toContain('<animate')
})

test('an asleep bar is static: the progress so far lit, all dim without elapsed time', () => {
  const idle = barSvg(COLOR, 'asleep', BAR_WIDTH)
  const waited = barSvg(COLOR, 'asleep', BAR_WIDTH, FILLING_ELAPSED_MS)

  expect(idle).not.toContain('<animate')
  expect(waited).not.toContain('<animate')
  expect(new Set(cellsOf(idle).map(cell => cell.opacity))).toEqual(new Set([BAR_EMPTY]))
  expect(columnsOf(waited).filter(isLitColumn).length).toBe(Math.floor(barProgress(FILLING_ELAPSED_MS) * COLUMNS))
})

test('equal arguments give the same bar, even after the cache has turned over', () => {
  const first = barSvg(COLOR, 'busy', BAR_WIDTH, FILLING_ELAPSED_MS)

  expect(barSvg(COLOR, 'busy', BAR_WIDTH, FILLING_ELAPSED_MS)).toBe(first)
  // Whole seconds are what counts.
  expect(barSvg(COLOR, 'busy', BAR_WIDTH, FILLING_ELAPSED_MS + 400)).toBe(first)
  for (let second = 0; second < MANY_BARS; second++) {
    barSvg(COLOR, 'busy', BAR_WIDTH, second * MS_PER_SECOND)
  }
  expect(barSvg(COLOR, 'busy', BAR_WIDTH, FILLING_ELAPSED_MS)).toBe(first)
  expect(avatarSvg('builder', 'busy', 56)).toBe(avatarSvg('builder', 'busy', 56))
  expect(bandSvg({ roleId: null, width: WIDTH, isBusy: true, mainSeed: 'session', workerSeed: 'worker' })).toBe(bandSvg({ roleId: null, width: WIDTH, isBusy: true, mainSeed: 'session', workerSeed: 'worker' }))
})

test('the main agent is drawn as an orchestrator character, varied by session', () => {
  const sessions = new Set(Array.from({ length: 100 }, (_, index) => spriteFor(null, `session-${index}`).name))
  const asleep = avatarSvg('orchestrator', 'asleep', 56, 'session')

  expect(sessions.size).toBeGreaterThan(1)
  expect(asleep).toContain(CLOSED_EYE)
  expect(asleep).toContain('viewBox="0 0 19 14"')
})
