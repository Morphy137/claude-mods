import { expect, test } from 'claude-code/testing'

import { MAX_LUMINANCE, MIN_LUMINANCE, luminance, readableColor } from './colors'
import { ROLES } from './roles'

const ROUNDING_SLACK = 0.01

test('a light color is darkened until it reads on white', () => {
  const tone = readableColor('#f5b800')

  expect(tone).not.toBe('#f5b800')
  expect(luminance(tone)).toBeLessThanOrEqual(MAX_LUMINANCE)
})

test('a very dark color is lightened until it reads on a dark background', () => {
  expect(luminance(readableColor('#111111'))).toBeGreaterThanOrEqual(MIN_LUMINANCE)
})

test('a mid-tone color and a non-hex string stay as they are', () => {
  expect(readableColor('#8b5cf6')).toBe('#8b5cf6')
  expect(readableColor('red')).toBe('red')
})

test('every role color ends up inside the readable band', () => {
  for (const role of ROLES) {
    const value = luminance(readableColor(role.color))

    expect(value).toBeLessThanOrEqual(MAX_LUMINANCE)
    expect(value).toBeGreaterThanOrEqual(MIN_LUMINANCE - ROUNDING_SLACK)
  }
})
