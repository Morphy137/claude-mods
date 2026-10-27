import { expect, test } from 'claude-code/testing'

import type { ArchivedWorker, SessionSnapshot, Worker } from '../types'
import { ORCHESTRATOR_ID, newOrchestrator } from './orchestrator'
import { ORCHESTRATOR_ROLE_ID } from './roles'
import {
  EARLIER_SESSIONS_LABEL,
  HEARTBEAT_MS,
  MAX_REMOTE_SESSIONS,
  SESSION_TITLE_CHARS,
  SNAPSHOT_VERSION,
  STALE_MS,
  archiveEntry,
  endedSnapshot,
  finishVanished,
  restoredOrchestrator,
  restoredTitle,
  restoredUnfinished,
  firstPromptTitle,
  isFileRecent,
  labelFromCwd,
  liveSnapshots,
  parseSessionSnapshot,
  parseSnapshotText,
  pastSessionGroups,
  pastSessionRoot,
  promptTitle,
  sameSnapshots,
  sessionEntries,
  sessionFileName,
  sessionLabel,
  sessionRootId,
  shouldPublish,
  snapshotContentKey,
} from './sessions'

const NOW = 100_000

const snapshot = (sessionId: string, overrides: Partial<SessionSnapshot> = {}): SessionSnapshot => ({
  version: SNAPSHOT_VERSION,
  sessionId,
  label: sessionId,
  cwd: `/work/${sessionId}`,
  orchestrator: newOrchestrator(),
  heartbeat: NOW,
  workers: [],
  ...overrides,
})

test('labelFromCwd takes the last segment for either separator', () => {
  const windowsPath = 'C:\\Users\\me\\proj'
  expect(labelFromCwd(windowsPath)).toBe('proj')
  expect(labelFromCwd('/home/me/proj/')).toBe('proj')
  expect(labelFromCwd('')).toBe('—')
})

test('sessionFileName strips characters unsafe in a file name', () => {
  expect(sessionFileName('abc-123')).toBe('abc-123.json')
  expect(sessionFileName('../x/y')).toBe('___x_y.json')
})

test('parseSessionSnapshot accepts a valid snapshot and normalizes workers', () => {
  const parsed = parseSessionSnapshot({
    version: 2,
    sessionId: 's1',
    cwd: '/a/b',
    heartbeat: 5,
    workers: [{ id: 'w1', status: 'running', cost: 1.5 }, { id: '', status: 'running' }, { id: 'w2', status: 'bogus' }, 7],
  })
  expect(parsed?.label).toBe('b')
  expect(parsed?.workers.map(worker => worker.id)).toEqual(['w1'])
  expect(parsed?.workers[0]?.cost).toBe(1.5)
  expect(parsed?.workers[0]?.parentId).toBe('')
})

test('parseSessionSnapshot rejects malformed input', () => {
  expect(parseSessionSnapshot(null)).toBeNull()
  expect(parseSessionSnapshot([])).toBeNull()
  expect(parseSessionSnapshot({ version: 3, sessionId: 's', workers: [] })).toBeNull()
  expect(parseSessionSnapshot({ version: 2, sessionId: '', workers: [] })).toBeNull()
  expect(parseSessionSnapshot({ version: 2, sessionId: 's', workers: 'no' })).toBeNull()
  expect(parseSnapshotText('{not json')).toBeNull()
})

test('liveSnapshots drops own, stale and ended sessions and sorts by label', () => {
  const result = liveSnapshots(
    [
      snapshot('b'),
      snapshot('a'),
      snapshot('me'),
      snapshot('old', { heartbeat: NOW - STALE_MS - 1 }),
      snapshot('ended', { heartbeat: 0 }),
    ],
    'me',
    NOW,
  )
  expect(result.map(item => item.sessionId)).toEqual(['a', 'b'])
})

test('liveSnapshots caps the number of sessions', () => {
  const many = Array.from({ length: MAX_REMOTE_SESSIONS + 5 }, (_, index) => snapshot(`s${index}`))
  expect(liveSnapshots(many, 'me', NOW)).toHaveLength(MAX_REMOTE_SESSIONS)
})

test('sameSnapshots ignores heartbeat but sees content changes', () => {
  const base = [snapshot('a')]
  expect(sameSnapshots(base, [snapshot('a', { heartbeat: NOW + 1 })])).toBe(true)
  expect(sameSnapshots(base, [snapshot('a', { orchestrator: newOrchestrator(1, 'a', 1) })])).toBe(false)
  expect(sameSnapshots(base, [])).toBe(false)
  expect(snapshotContentKey(snapshot('a'))).toBe(snapshotContentKey(snapshot('a', { heartbeat: 9 })))
})

test('shouldPublish on change or when the heartbeat is due', () => {
  expect(shouldPublish(undefined, 'k', NOW, NOW)).toBe(true)
  expect(shouldPublish('k', 'k', NOW, NOW + HEARTBEAT_MS - 1)).toBe(false)
  expect(shouldPublish('k', 'k', NOW, NOW + HEARTBEAT_MS)).toBe(true)
  expect(shouldPublish('k', 'other', NOW, NOW)).toBe(true)
})

test('isFileRecent keeps files touched within the stale window', () => {
  expect(isFileRecent(NOW - STALE_MS, NOW)).toBe(true)
  expect(isFileRecent(NOW - STALE_MS - 1, NOW)).toBe(false)
})

test('promptTitle flattens whitespace and clips long prompts', () => {
  expect(promptTitle('  fix\n the   login  ')).toBe('fix the login')
  const clipped = promptTitle('x'.repeat(SESSION_TITLE_CHARS * 2))
  expect(clipped).toHaveLength(SESSION_TITLE_CHARS)
  expect(clipped.endsWith('…')).toBe(true)
})

test('firstPromptTitle uses the first real user prompt', () => {
  const messages = [
    { role: 'assistant', text: 'hello' },
    { role: 'user', text: '/agent-dashboard' },
    { role: 'user', text: '<system-reminder>ignore</system-reminder>' },
    { role: 'user', text: '   ' },
    { role: 'user', text: 'Build the dashboard' },
    { role: 'user', text: 'second prompt' },
  ]

  expect(firstPromptTitle(messages)).toBe('Build the dashboard')
  expect(firstPromptTitle([])).toBe('')
  expect(firstPromptTitle([{ role: 'assistant', text: 'hi' }])).toBe('')
})

test('sessionLabel prefers the title and falls back to the directory name', () => {
  expect(sessionLabel('Build the dashboard', 'C:/work/mine')).toBe('Build the dashboard')
  expect(sessionLabel('', 'C:/work/mine')).toBe('mine')
})

test('a version 2 snapshot keeps its orchestrator, always as the root worker', () => {
  const parsed = parseSessionSnapshot({
    version: 2,
    sessionId: 's1',
    label: 'Build it',
    orchestrator: {
      id: 'spoofed',
      parentId: 'x',
      role: 'builder',
      title: 'Build it',
      model: 'claude-opus-5-5',
      effort: 'high',
      status: 'running',
      tools: 4,
      tokens: 900,
      cost: 1.25,
      startedAt: 10,
    },
    workers: [],
  })

  expect(parsed?.version).toBe(SNAPSHOT_VERSION)
  expect(parsed?.orchestrator).toMatchObject({
    id: ORCHESTRATOR_ID,
    parentId: '',
    role: ORCHESTRATOR_ROLE_ID,
    model: 'claude-opus-5-5',
    effort: 'high',
    status: 'running',
    tools: 4,
    tokens: 900,
    cost: 1.25,
  })
})

test('a version 1 snapshot still parses, with an idle orchestrator carrying its mainCost', () => {
  const parsed = parseSessionSnapshot({
    version: 1,
    sessionId: 's1',
    cwd: '/a/b',
    mainCost: 2,
    heartbeat: 5,
    workers: [{ id: 'w1', status: 'running' }],
  })

  expect(parsed?.version).toBe(SNAPSHOT_VERSION)
  expect(parsed?.orchestrator).toMatchObject({
    id: ORCHESTRATOR_ID,
    role: ORCHESTRATOR_ROLE_ID,
    status: 'idle',
    cost: 2,
    title: 'b',
  })
  expect(parsed?.workers).toHaveLength(1)
})

test('a version 2 snapshot with a malformed orchestrator falls back to an idle one', () => {
  const parsed = parseSessionSnapshot({
    version: 2,
    sessionId: 's1',
    orchestrator: { id: 'main', status: 'bogus' },
    workers: [],
  })

  expect(parsed?.orchestrator.status).toBe('idle')
  expect(parsed?.orchestrator.role).toBe(ORCHESTRATOR_ROLE_ID)
})

const archivedWorker = (id: string, startedAt: number, session?: [string, string], cost = 1): ArchivedWorker => ({
  ...newOrchestrator(startedAt, id, cost),
  id,
  parentId: '',
  status: 'completed',
  tokens: 100,
  endedAt: startedAt + 10,
  ...(session ? { sessionId: session[0], sessionLabel: session[1] } : {}),
})

test('archiveEntry records the session; without a session id the worker stays as it was', () => {
  const worker = archivedWorker('w', 1)

  expect(archiveEntry(worker, 's1', 'Fix bug')).toMatchObject({ id: 'w', sessionId: 's1', sessionLabel: 'Fix bug' })
  expect(archiveEntry(worker, '', 'ignored')).toBe(worker)
})

test('pastSessionGroups makes one group per session, newest first, legacy entries last', () => {
  const entries = [
    archivedWorker('legacy', 5),
    archivedWorker('old-a', 100, ['old', 'Old one']),
    archivedWorker('new-a', 300, ['new', 'New one']),
    archivedWorker('old-b', 120, ['old', 'Old one']),
    archivedWorker('mine', 400, ['me', 'Mine']),
  ]
  const groups = pastSessionGroups(entries, 'me')

  expect(groups.map(group => group.label)).toEqual(['New one', 'Old one', EARLIER_SESSIONS_LABEL])
  expect(groups[1]?.workers.map(worker => worker.id)).toEqual(['old-a', 'old-b'])
  expect(sessionEntries(entries, 'me').map(worker => worker.id)).toEqual(['mine'])
  expect(sessionEntries(entries, '')).toEqual([])
})

test('pastSessionRoot is a completed orchestrator carrying its workers totals', () => {
  const [group] = pastSessionGroups(
    [archivedWorker('a', 100, ['old', 'Old one'], 0.5), archivedWorker('b', 200, ['old', 'Old one'], 0.25)],
    'me',
  )
  const root = pastSessionRoot(group as NonNullable<typeof group>)

  expect(root).toMatchObject({
    id: sessionRootId(group as NonNullable<typeof group>),
    role: ORCHESTRATOR_ROLE_ID,
    title: 'Old one',
    status: 'completed',
    cost: 0.75,
    tokens: 200,
    startedAt: 100,
    endedAt: 210,
  })
})

const restorable = (id: string, status: Worker['status'], overrides: Partial<Worker> = {}): Worker => ({
  ...newOrchestrator(),
  id,
  type: 'agent',
  role: 'builder',
  status,
  ...overrides,
})

test('endedSnapshot keeps the data and zeroes the heartbeat, so readers drop it as gone', () => {
  const live = snapshot('s1', { workers: [restorable('w1', 'running')], label: 'Title' })
  const ended = endedSnapshot(live)

  expect(ended).toEqual({ ...live, heartbeat: 0 })
  expect(liveSnapshots([ended], 'other', NOW)).toEqual([])
})

test('a restored orchestrator is idle and keeps its totals', () => {
  const running = { ...newOrchestrator(5, 'x', 3), status: 'running' as const }

  expect(restoredOrchestrator(snapshot('s1', { orchestrator: running }))).toMatchObject({ status: 'idle', cost: 3 })
})

test('restoredTitle drops a label that is only the directory name', () => {
  expect(restoredTitle(snapshot('s1', { label: 'proj', cwd: '/work/proj' }))).toBe('')
  expect(restoredTitle(snapshot('s1', { label: 'Build it', cwd: '/work/proj' }))).toBe('Build it')
})

test('workers missing from the live list are finished at their last known time, others untouched', () => {
  const saved = snapshot('s1', {
    heartbeat: 900,
    workers: [
      restorable('gone', 'running', { startedAt: 100 }),
      restorable('live', 'running', { startedAt: 100 }),
      restorable('done', 'completed', { endedAt: 500 }),
      restorable('late', 'pending', { startedAt: 1000 }),
    ],
  })
  const lastKnown = restoredUnfinished(saved)
  expect([...lastKnown.entries()]).toEqual([['gone', 900], ['live', 900], ['late', 1000]])

  const settled = finishVanished(saved.workers, lastKnown, new Set(['live']))
  expect(settled.map(worker => [worker.id, worker.status, worker.endedAt])).toEqual([
    ['gone', 'completed', 900],
    ['live', 'running', 0],
    ['done', 'completed', 500],
    ['late', 'completed', 1000],
  ])
})

test('a worker that started after the restore is never finished by it', () => {
  const fresh = restorable('new', 'running')

  expect(finishVanished([fresh], new Map(), new Set())).toEqual([fresh])
})
