import { expect, test } from 'claude-code/testing'

import type { Worker, WorkerStatus } from '../types'
import { activityOf, isBusy, isFailed, isRunning } from './status'

const withStatus = (status: WorkerStatus) => ({ status }) as Worker

test('only running and pending workers are busy', () => {
  expect(isBusy(withStatus('running'))).toBe(true)
  expect(isBusy(withStatus('pending'))).toBe(true)
  for (const status of ['waiting', 'idle', 'completed', 'failed', 'killed'] as const) {
    expect(isBusy(withStatus(status))).toBe(false)
  }
})

test('parked workers are still running, finished ones are not', () => {
  expect(isRunning(withStatus('waiting'))).toBe(true)
  expect(isRunning(withStatus('idle'))).toBe(true)
  expect(isRunning(withStatus('completed'))).toBe(false)
  expect(isFailed(withStatus('killed'))).toBe(true)
  expect(isFailed(withStatus('completed'))).toBe(false)
})

test('statuses map to an activity', () => {
  expect(activityOf('running')).toBe('busy')
  expect(activityOf('waiting')).toBe('asleep')
  expect(activityOf('idle')).toBe('asleep')
  expect(activityOf('completed')).toBe('finished')
  expect(activityOf('failed')).toBe('finished')
})
