import { expect, test } from 'claude-code/testing'

import { isPaneDismissal } from './pane'

test('a close by the person or by a plugin is a dismissal, an unload is not', () => {
  expect(isPaneDismissal('person')).toBe(true)
  expect(isPaneDismissal('plugin')).toBe(true)
  expect(isPaneDismissal('unload')).toBe(false)
})
