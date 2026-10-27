import { expect, test } from 'claude-code/testing'

import type { SessionSnapshot, Worker } from '../types'
import { newOrchestrator } from './orchestrator'
import { sameSnapshotsStructure, sameWorkerStructure, sameWorkersStructure } from './publish'

const worker = (patch: Partial<Worker> = {}): Worker => ({
  ...newOrchestrator(),
  id: 'a1',
  type: 'agent',
  status: 'running',
  startedAt: 100,
  ...patch,
})

const snapshot = (workers: Worker[], heartbeat = 1): SessionSnapshot => ({
  version: 2,
  sessionId: 's1',
  label: 'proj',
  cwd: 'C:/proj',
  orchestrator: newOrchestrator(),
  heartbeat,
  workers,
})

test('workers that differ only in counters have the same structure', () => {
  const counted = worker({ tools: 9, lastTool: 'Read', files: ['a.ts'], tokens: 50, cost: 1.5, lastCallCost: 0.2 })

  expect(sameWorkerStructure(worker(), counted)).toBe(true)
  expect(sameWorkersStructure([worker()], [counted])).toBe(true)
})

test('a status, title, model, summary or membership change is a structural change', () => {
  for (const patch of [
    { status: 'completed' as const },
    { title: 'other' },
    { model: 'claude-opus-5-5' },
    { summary: 'done' },
    { endedAt: 5 },
  ]) {
    expect(sameWorkerStructure(worker(), worker(patch))).toBe(false)
  }
  expect(sameWorkersStructure([worker()], [])).toBe(false)
  expect(sameWorkersStructure([worker()], [worker({ id: 'a2' })])).toBe(false)
})

test('snapshots that differ only in heartbeat and counters have the same structure', () => {
  const before = [snapshot([worker()])]
  const counted = [{ ...snapshot([worker({ tools: 4, cost: 2 })], 99), orchestrator: newOrchestrator(0, '', 7) }]

  expect(sameSnapshotsStructure(before, counted)).toBe(true)
  expect(sameSnapshotsStructure(before, [snapshot([worker({ status: 'waiting' })])])).toBe(false)
  expect(sameSnapshotsStructure(before, [])).toBe(false)
})
