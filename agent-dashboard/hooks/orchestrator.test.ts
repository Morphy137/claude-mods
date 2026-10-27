import { expect, test } from 'claude-code/testing'

import {
  ORCHESTRATOR_ID,
  endMainTurn,
  newOrchestrator,
  recordModel,
  recordToolCall,
  startMainTurn,
  withStart,
  withWaiting,
} from './orchestrator'
import { ORCHESTRATOR_ROLE_ID } from './roles'
import { activityOf } from './status'

const STAMP = 5000
const LATER = 9000

test('a new orchestrator is the root worker and starts asleep', () => {
  const main = newOrchestrator()

  expect(main.id).toBe(ORCHESTRATOR_ID)
  expect(main.parentId).toBe('')
  expect(main.role).toBe(ORCHESTRATOR_ROLE_ID)
  expect(activityOf(main.status)).toBe('asleep')
})

test('a main turn wakes the orchestrator and starts its clock once', () => {
  const started = startMainTurn(newOrchestrator(), STAMP)

  expect(activityOf(started.status)).toBe('busy')
  expect(started.startedAt).toBe(STAMP)
  expect(startMainTurn(started, LATER).startedAt).toBe(STAMP)
  expect(withStart(newOrchestrator(), STAMP).startedAt).toBe(STAMP)
})

test('the end of a turn parks the orchestrator and adds what the turn cost', () => {
  const busy = startMainTurn(newOrchestrator(STAMP), STAMP)
  const done = endMainTurn(busy, { model: 'claude-opus-5-5', tokens: 120, cost: 0.5 }, 'All done')

  expect(activityOf(done.status)).toBe('asleep')
  expect(done).toMatchObject({ model: 'claude-opus-5-5', tokens: 120, cost: 0.5, lastCallCost: 0.5, summary: 'All done' })
  expect(endMainTurn(done, { model: '', tokens: 30, cost: 0.25 })).toMatchObject({
    model: 'claude-opus-5-5',
    tokens: 150,
    cost: 0.75,
    summary: 'All done',
  })
})

test('an interrupted turn without usage still parks the orchestrator', () => {
  const busy = startMainTurn(newOrchestrator(STAMP), STAMP)

  expect(endMainTurn(busy)).toEqual({ ...busy, status: 'idle' })
})

test('tool calls count and remember the edited files, newest last', () => {
  const first = recordToolCall(newOrchestrator(), 'Edit', 'a.ts')
  const second = recordToolCall(recordToolCall(first, 'Edit', 'a.ts'), 'Read', 'b.ts')

  expect(second.tools).toBe(3)
  expect(second.lastTool).toBe('Read')
  expect(second.files).toEqual(['a.ts'])
})

test('recordModel keeps the effort when a step states none', () => {
  const main = recordModel(newOrchestrator(), 'claude-opus-5-5', 'high')

  expect(recordModel(main, 'claude-sonnet-5-5', undefined)).toMatchObject({
    model: 'claude-sonnet-5-5',
    effort: 'high',
  })
})

test('a parked orchestrator with busy sub-agents is waiting, never stored as such', () => {
  const idle = newOrchestrator()
  const busy = startMainTurn(idle, STAMP)
  const done = { ...idle, status: 'completed' as const }

  expect(withWaiting(idle, true).status).toBe('waiting')
  expect(withWaiting(idle, false)).toBe(idle)
  expect(withWaiting(busy, true)).toBe(busy)
  expect(withWaiting(done, true)).toBe(done)
  expect(idle.status).toBe('idle')
})

test('a turn stamps when it began, and a turn started while one runs keeps the earlier stamp', () => {
  const started = startMainTurn(newOrchestrator(), STAMP)

  expect(started.busySince).toBe(STAMP)
  expect(startMainTurn(started, LATER).busySince).toBe(STAMP)
  expect(startMainTurn(endMainTurn(started), LATER).busySince).toBe(LATER)
})
