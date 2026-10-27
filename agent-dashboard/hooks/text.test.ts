import { expect, test } from 'claude-code/testing'

import { formatCount, formatDuration } from './text'

test('counts get three significant digits and an English suffix', () => {
  expect(formatCount(0)).toBe('0')
  expect(formatCount(999)).toBe('999')
  expect(formatCount(1000)).toBe('1K')
  expect(formatCount(12_345)).toBe('12.3K')
  expect(formatCount(100_000)).toBe('100K')
  expect(formatCount(2_274_000)).toBe('2.27M')
  expect(formatCount(950_000_000)).toBe('950M')
  expect(formatCount(4_100_000_000)).toBe('4.1B')
  expect(formatCount(7_000_000_000_000)).toBe('7T')
  expect(formatCount(999_999)).toBe('1M')
})

test('durations read in seconds, minutes, hours and days', () => {
  expect(formatDuration(0)).toBe('0s')
  expect(formatDuration(45_000)).toBe('45s')
  expect(formatDuration(12 * 60_000 + 30_000)).toBe('12m')
  expect(formatDuration(3 * 3_600_000 + 5 * 60_000)).toBe('3h 05m')
  expect(formatDuration(2 * 86_400_000 + 4 * 3_600_000 + 59 * 60_000)).toBe('2d 4h')
})
