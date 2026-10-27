import type { AgentInfo, On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { SYNC_MS } from './sessions'

const CLOCK_START = 1_000_000
const TICK_MS = 1000
// The pane clock of register.tsx: counters and elapsed times reach the pane this often.
const PANE_CLOCK_MS = 5000

const PANE = {
  plugin: 'agent-dashboard',
  component: 'Pane',
  requestId: 'agent-workers',
  props: {
    title: 'Agents',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

type Pressable = { press: (target: { key: string }) => Promise<unknown> }

const openDetails = async (ui: Pressable, ...ids: string[]) => {
  for (const id of ids) {
    await ui.press({ key: `detail:${id}` })
  }
}

const RUN_AGENTS = {
  command: 'agent-dashboard',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
} as const

test('a refused command name does not stop agents from being tracked', async ($, on) => {
  const clock = mock.clock(on, { now: CLOCK_START })
  const stored: unknown[] = []
  on('command.register', () => ({ deny: 'a built-in command has that name' }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', (_, e) => {
    stored.push(e.value)

    return { value: undefined }
  })
  on('agent.list', () => ({
    value: [{ id: 'a1', description: 'finished task', type: 'Explore', status: 'completed' }],
  }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.advance(TICK_MS)

  expect(JSON.stringify(stored)).toContain('finished task')
})

test('/agent-dashboard opens the pane when closed and closes it when open', async ($, on) => {
  let openIds: string[] = []
  const calls: string[] = []
  on('command.register', () => ({ value: RUN_AGENTS }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.panes', () => ({ value: openIds.map(id => ({ id, title: id, isShown: true, isFocused: false, isPlaced: true })) }))
  on('ui.open', (_, e) => {
    calls.push('open')
    openIds = [e.id]

    return { value: { isPlaced: true } }
  })
  on('ui.close', () => {
    calls.push('close')
    openIds = []

    return { value: undefined }
  })
  on('agent.list', () => ({ value: [] }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect(calls).toEqual([])

  await $.command.run(RUN_AGENTS)
  await $.command.run(RUN_AGENTS)
  expect(calls).toEqual(['open', 'close'])
})

test('the pane shows the orchestrator card on every surface', async ($, on) => {
  on('command.register', () => ({ value: RUN_AGENTS }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('agent.list', () => ({ value: [] }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /Claude/ })).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: /Orchestrator/ })).toBeUndefined()
    await openDetails(ui, 'main')
    expect(await ui.find({ type: 'Text', text: /Orchestrator/ })).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: /Claude main/ })).toBeUndefined()
    await openDetails(ui, 'main')
    await ui.unmount()
  }
})


const remoteSnapshot = (heartbeat: number) => ({
  version: 2,
  orchestrator: { id: 'main', status: 'idle', model: 'claude-opus-5-5', cost: 1 },
  sessionId: 'other',
  label: 'other-proj',
  cwd: 'C:/work/other-proj',
  heartbeat,
  workers: [{ id: 'w1', title: 'remote task', status: 'running', cost: 0.5 }],
})

test('sessions publish their snapshot and show running agents of other sessions', async ($, on) => {
  const clock = mock.clock(on, { now: CLOCK_START })
  const written: Record<string, string> = {}
  on('command.register', () => ({ value: RUN_AGENTS }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('agent.list', () => ({ value: [] }))
  on('env.get', (_, e) => ({ value: e.name === 'USERPROFILE' ? 'C:/home' : undefined }))
  on('store.get', () => ({ value: undefined }))
  on('session.id', () => ({ value: 'me' }))
  on('session.cwd', () => ({ value: 'C:/work/mine' }))
  on('fs.write', (_, e) => {
    written[e.path] = e.text

    return { value: undefined }
  })
  on('fs.list', () => ({
    value: [
      { name: 'me.json', kind: 'file', size: 1, mtimeMs: CLOCK_START, isLink: false },
      { name: 'other.json', kind: 'file', size: 1, mtimeMs: CLOCK_START, isLink: false },
      { name: 'old.json', kind: 'file', size: 1, mtimeMs: 0, isLink: false },
    ],
  }))
  on('fs.read', (_, e) => ({
    value: e.path.endsWith('other.json') ? JSON.stringify(remoteSnapshot(CLOCK_START)) : '{}',
  }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.advance(SYNC_MS)

  const ownFile = Object.entries(written).find(([path]) => path.endsWith('me.json'))?.[1]
  const own = JSON.parse(ownFile ?? 'null')
  expect(own?.label).toBe('mine')
  expect(own?.sessionId).toBe('me')
  expect(own?.version).toBe(2)
  expect(own?.orchestrator).toMatchObject({ id: 'main', role: 'orchestrator', title: 'mine' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /This session/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /other-proj/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /Opus 5\.5 · Waiting · ≈\$1\.50/ })).toBeTruthy()
  await ui.unmount()
})

const BAND = {
  plugin: 'agent-dashboard',
  component: 'AbovePrompt',
  requestId: 'band',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 5 },
    view: {},
  },
} as const

const PACKET_MARK = 'attributeName="x"'
const CLOSED_EYE = 'height="0.4"'

const startWithAgents = async ($: Engine, on: On, agents: AgentInfo[]) => {
  const clock = mock.clock(on, { now: CLOCK_START })
  on('command.register', () => ({ value: RUN_AGENTS }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('env.get', () => ({ value: undefined }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('agent.list', () => ({ value: agents }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await clock.advance(TICK_MS)

  return clock
}

const svgSources = async (ui: { findAll: (query: { type: string }) => Promise<Array<{ props: Record<string, unknown> }>> }) =>
  (await ui.findAll({ type: 'Svg' })).map(svg => String(svg.props.source))

test('the band is always there: with no workers it shows the toggle and sleeps', async ($, on) => {
  on('command.register', () => ({ value: RUN_AGENTS }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('agent.list', () => ({ value: [] }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /No agents running/ })).toBeTruthy()
    expect(await ui.find({ type: 'Button', text: /Agents/ })).toBeTruthy()
    if (surface === 'desktop') {
      const [source = ''] = await svgSources(ui)
      expect(source).toContain(CLOSED_EYE)
      expect(source).not.toContain(PACKET_MARK)
    }
    await ui.unmount()
  }
})

test('a running worker animates the band', async ($, on) => {
  await startWithAgents($, on, [
    { id: 'a1', description: 'review the diff', type: 'general-purpose', status: 'running' },
  ])
  const busyUi = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await busyUi.find({ type: 'Text', text: /1 running/ })).toBeTruthy()
  expect((await svgSources(busyUi)).join('')).toContain(PACKET_MARK)
  await busyUi.unmount()
})

test('a waiting worker keeps the band asleep and its card avatar asleep', async ($, on) => {
  await startWithAgents($, on, [
    { id: 'a1', description: 'review the diff', type: 'general-purpose', status: 'waiting' },
  ])
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ type: 'Text', text: /No agents running · last:/ })).toBeTruthy()
  expect((await svgSources(band)).join('')).not.toContain(PACKET_MARK)
  await band.unmount()

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const sources = await svgSources(pane)
  expect(sources.some(source => source.includes(CLOSED_EYE))).toBe(true)
  expect(sources.join('')).not.toContain(PACKET_MARK)
  await pane.unmount()
})

test('the session title is the first prompt and heads the session sections', async ($, on) => {
  const clock = mock.clock(on, { now: CLOCK_START })
  const written: Record<string, string> = {}
  on('command.register', () => ({ value: RUN_AGENTS }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('agent.list', () => ({ value: [] }))
  on('env.get', (_, e) => ({ value: e.name === 'USERPROFILE' ? 'C:/home' : undefined }))
  on('store.get', () => ({ value: undefined }))
  on('session.id', () => ({ value: 'me' }))
  on('session.cwd', () => ({ value: 'C:/work/mine' }))
  on('session.messages', () => ({
    value: [
      { role: 'user', text: '/agent-dashboard', toolUses: [] },
      { role: 'user', text: 'Build   the dashboard', toolUses: [] },
    ],
  }))
  on('fs.write', (_, e) => {
    written[e.path] = e.text

    return { value: undefined }
  })
  on('fs.list', () => ({
    value: [{ name: 'other.json', kind: 'file', size: 1, mtimeMs: CLOCK_START, isLink: false }],
  }))
  on('fs.read', () => ({ value: JSON.stringify(remoteSnapshot(CLOCK_START)) }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.advance(SYNC_MS)

  const ownFile = Object.entries(written).find(([path]) => path.endsWith('me.json'))?.[1]
  expect(JSON.parse(ownFile ?? 'null')?.label).toBe('Build the dashboard')

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /This session · Build the dashboard/ })).toBeTruthy()
  await ui.unmount()
})


test('a version 1 snapshot of another session still shows as an orchestrator row', async ($, on) => {
  const clock = mock.clock(on, { now: CLOCK_START })
  on('command.register', () => ({ value: RUN_AGENTS }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('agent.list', () => ({ value: [] }))
  on('env.get', (_, e) => ({ value: e.name === 'USERPROFILE' ? 'C:/home' : undefined }))
  on('store.get', () => ({ value: undefined }))
  on('session.id', () => ({ value: 'me' }))
  on('session.cwd', () => ({ value: 'C:/work/mine' }))
  on('fs.write', () => ({ value: undefined }))
  on('fs.list', () => ({
    value: [{ name: 'old.json', kind: 'file', size: 1, mtimeMs: CLOCK_START, isLink: false }],
  }))
  on('fs.read', () => ({
    value: JSON.stringify({
      version: 1,
      sessionId: 'legacy',
      label: 'legacy-proj',
      cwd: 'C:/work/legacy-proj',
      mainCost: 2,
      heartbeat: CLOCK_START,
      workers: [{ id: 'w1', title: 'legacy task', status: 'running', cost: 0.5 }],
    }),
  }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.advance(SYNC_MS)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /legacy-proj/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /Waiting · ≈\$2\.50/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /legacy task/ })).toBeTruthy()
  await ui.unmount()
})

const USAGE = {
  model: 'claude-opus-5-5',
  input_tokens: 1000,
  output_tokens: 500,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
}
// 1000 input at $5 and 500 output at $25 per million tokens.
const USAGE_COST = '≈$0.02'

type Finder = {
  findAll: (query: { type: string; text?: RegExp }) => Promise<Array<{ text: string }>>
}

const textsOf = async (ui: Finder, pattern: RegExp) =>
  (await ui.findAll({ type: 'Text', text: pattern })).map(found => found.text)

const startMainLoop = async ($: Engine, on: On, agents: AgentInfo[] = []) => {
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', () => ({ result: undefined }))
  return startWithAgents($, on, agents)
}

test('main-loop events update the orchestrator and park it when the turn ends', async ($, on) => {
  const clock = await startMainLoop($, on)

  await $.turn.start({ text: 'build it', turnId: 't1' })
  await $.tool.call({ tool: 'Read', tool_use_id: 'u1', file_path: 'a.ts' })
  await $.tool.call({ tool: 'Read', tool_use_id: 'u2', file_path: 'b.ts' })
  await clock.advance(PANE_CLOCK_MS)
  const busy = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await openDetails(busy, 'main')
  expect(await textsOf(busy, /^Running$/)).toHaveLength(1)
  expect((await textsOf(busy, /2 tools/))[0]).toContain('Read')
  expect((await svgSources(busy)).join('')).toContain('type="rotate"')
  await busy.unmount()

  await $.turn.complete({ answer: 'done', durationMs: 5, isAborted: false, turnId: 't1', reason: 'answer', usage: USAGE })
  const asleep = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await textsOf(asleep, /^Idle$/)).toHaveLength(1)
  expect(await textsOf(asleep, /^Running$/)).toHaveLength(0)
  expect((await textsOf(asleep, /^2k · /))[0]).toContain(USAGE_COST)
  expect((await svgSources(asleep)).join('')).not.toContain('type="rotate"')
  await asleep.unmount()
})

test('an interrupted main turn without usage still parks the orchestrator', async ($, on) => {
  await startMainLoop($, on)

  await $.turn.start({ text: 'build it', turnId: 't1' })
  await $.turn.complete({ answer: '', durationMs: 5, isAborted: true, turnId: 't1', reason: 'aborted' })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await openDetails(ui, 'main')
  expect(await textsOf(ui, /^Idle$/)).toHaveLength(1)
  await ui.unmount()
})

test('events of a sub-agent do not touch the orchestrator', async ($, on) => {
  await startMainLoop($, on, [
    { id: 'a1', description: 'review the diff', type: 'general-purpose', status: 'running' },
  ])

  await $.turn.start({ text: 'go', turnId: 't1', agentId: 'a1' })
  await $.tool.call({ tool: 'Grep', tool_use_id: 'u1', pattern: 'x', agentId: 'a1' })
  await $.turn.complete({
    answer: 'ok',
    durationMs: 5,
    isAborted: false,
    turnId: 't1',
    agentId: 'a1',
    reason: 'answer',
    usage: USAGE,
  })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await openDetails(ui, 'main', 'a1')
  const tools = await textsOf(ui, / tools/)
  expect(tools).toHaveLength(2)
  expect(tools[0]).toContain('0 tools')
  expect(tools[1]).toContain('1 tools')
  expect(await textsOf(ui, /^Waiting$/)).toHaveLength(1)
  expect(await textsOf(ui, /^Running$/)).toHaveLength(1)
  await ui.unmount()
})

const NESTED_AGENTS: AgentInfo[] = [
  { id: 'a1', description: 'review the diff', type: 'general-purpose', status: 'running' },
  { id: 'a2', description: 'write the docs', type: 'general-purpose', status: 'running', parentId: 'a1' },
]
// Role names: Claude is the orchestrator, Iris the Inspector and Penny the Writer.
const ROLE_NAMES = /^(Claude|Iris|Penny)$/

test('the orchestrator is the root card and sub-agents nest under it', async ($, on) => {
  await startWithAgents($, on, NESTED_AGENTS)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await textsOf(ui, ROLE_NAMES)).toEqual(['Claude', 'Iris', 'Penny'])
  await openDetails(ui, 'main', 'a1')
  expect(await ui.find({ type: 'Text', text: /incl\. sub-agents/ })).toBeTruthy()
  await ui.unmount()
})

test('one unbroken line: a gutter spans each child row and a trunk hangs under each parent avatar', async ($, on) => {
  await startWithAgents($, on, NESTED_AGENTS)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await textsOf(ui, /─/)).toEqual(['└─', '└─'])
  const guides = (await ui.findAll({ type: 'Box' })).filter(box => box.props.position === 'absolute')
  expect(guides).toHaveLength(4)
  for (const guide of guides) {
    expect(guide.props).toMatchObject({ top: 0, bottom: 0, overflow: 'hidden' })
  }
  expect(await textsOf(ui, /^│\n│/)).toHaveLength(2)
  await ui.unmount()
})

test('sub-agents are shown on the Running tab and can be hidden with their toggle', async ($, on) => {
  await startWithAgents($, on, NESTED_AGENTS)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.findAll({ type: 'Button', text: /▾ 1 sub-agent/ })).toHaveLength(2)
  await ui.press({ key: 'children:running:main' })
  expect(await textsOf(ui, ROLE_NAMES)).toEqual(['Claude'])
  expect(await ui.find({ type: 'Button', text: /▸ 1 sub-agent/ })).toBeTruthy()
  await ui.press({ key: 'children:running:main' })
  expect(await textsOf(ui, ROLE_NAMES)).toEqual(['Claude', 'Iris', 'Penny'])
  await ui.press({ key: 'children:running:a1' })
  expect(await textsOf(ui, ROLE_NAMES)).toEqual(['Claude', 'Iris'])
  await ui.unmount()
})

test('History starts with sub-agents collapsed and keeps its own toggle state', async ($, on) => {
  await startWithAgents($, on, NESTED_AGENTS)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'history' })
  expect(await textsOf(ui, ROLE_NAMES)).toEqual(['Claude'])
  expect(await ui.find({ type: 'Button', text: /▸ 1 sub-agent/ })).toBeTruthy()
  await ui.press({ key: 'children:history:main' })
  expect(await textsOf(ui, ROLE_NAMES)).toEqual(['Claude', 'Iris'])
  await ui.press({ key: 'running' })
  expect(await textsOf(ui, ROLE_NAMES)).toEqual(['Claude', 'Iris', 'Penny'])
  await ui.unmount()
})

test('cards are compact until their arrow is pressed', async ($, on) => {
  await startWithAgents($, on, NESTED_AGENTS.slice(0, 1))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const compact = /^≈\$0\.00 · \d+:\d\d$/
  const STATUS_LINE = /→.*→.*→/
  expect(await textsOf(ui, STATUS_LINE)).toHaveLength(0)
  expect(await textsOf(ui, / tools/)).toHaveLength(0)
  expect(await textsOf(ui, compact)).toHaveLength(2)
  expect(await ui.find({ type: 'Button', text: /^▸$/ })).toBeTruthy()
  await ui.press({ key: 'detail:a1' })
  expect(await textsOf(ui, STATUS_LINE)).toHaveLength(1)
  expect(await textsOf(ui, compact)).toHaveLength(1)
  await ui.press({ key: 'detail:a1' })
  expect(await textsOf(ui, STATUS_LINE)).toHaveLength(0)
  await ui.unmount()
})

test('a parked orchestrator waits while sub-agents run and idles once they are done', async ($, on) => {
  const agents: AgentInfo[] = [
    { id: 'a1', description: 'review the diff', type: 'general-purpose', status: 'running' },
  ]
  const clock = await startMainLoop($, on, agents)

  const waiting = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await openDetails(waiting, 'main')
  expect(await textsOf(waiting, /^Waiting$/)).toHaveLength(1)
  expect(await textsOf(waiting, /^Idle$/)).toHaveLength(0)
  expect((await svgSources(waiting)).some(source => source.includes(CLOSED_EYE))).toBe(true)
  await waiting.unmount()

  agents[0] = { id: 'a1', description: 'review the diff', type: 'general-purpose', status: 'completed' }
  await clock.advance(TICK_MS)
  const idle = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await textsOf(idle, /^Idle$/)).toHaveLength(1)
  await idle.unmount()
})

const ARCHIVED_BASE = {
  parentId: '',
  type: 'agent',
  role: 'builder',
  model: 'claude-haiku-5-5',
  effort: '',
  status: 'completed',
  tools: 0,
  lastTool: '',
  files: [],
  tokens: 1000,
  cost: 0.25,
  lastCallCost: 0,
  summary: '',
  endedAt: 0,
}
const archived = (id: string, startedAt: number, session?: { sessionId: string; sessionLabel: string }) => ({
  ...ARCHIVED_BASE,
  id,
  title: id,
  startedAt,
  ...session,
})

test('History groups finished workers under one root per session, newest session first', async ($, on) => {
  const clock = mock.clock(on, { now: CLOCK_START })
  on('command.register', () => ({ value: RUN_AGENTS }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('env.get', () => ({ value: undefined }))
  on('agent.list', () => ({ value: [] }))
  on('session.id', () => ({ value: 'me' }))
  on('session.cwd', () => ({ value: 'C:/work/mine' }))
  on('store.set', () => ({ value: undefined }))
  on('store.get', () => ({
    value: [
      archived('legacy-worker', 10),
      archived('older-worker', 100, { sessionId: 's1', sessionLabel: 'Older session' }),
      archived('newer-worker', 200, { sessionId: 's2', sessionLabel: 'Newer session' }),
      archived('mine-worker', 300, { sessionId: 'me', sessionLabel: 'mine' }),
    ],
  }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.advance(TICK_MS)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'history' })
  const roots = /^ (mine|Newer session|Older session|Earlier sessions)$/
  expect(await textsOf(ui, roots)).toEqual([' mine', ' Newer session', ' Older session', ' Earlier sessions'])
  expect(await textsOf(ui, /^ [a-z]+-worker$/)).toEqual([])

  await ui.press({ key: 'children:history:session:s2' })
  expect(await textsOf(ui, /^ [a-z]+-worker$/)).toEqual([' newer-worker'])
  await ui.press({ key: 'children:history:session:earlier' })
  await ui.press({ key: 'children:history:main' })
  expect(await textsOf(ui, /^ [a-z]+-worker$/)).toEqual([' mine-worker', ' newer-worker', ' legacy-worker'])
  await ui.unmount()
})

test('finished workers are archived with the session they ran in', async ($, on) => {
  const clock = mock.clock(on, { now: CLOCK_START })
  const stored: unknown[][] = []
  on('command.register', () => ({ value: RUN_AGENTS }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('env.get', () => ({ value: undefined }))
  on('session.id', () => ({ value: 'me' }))
  on('session.cwd', () => ({ value: 'C:/work/mine' }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', (_, e) => {
    stored.push(e.value as unknown[])

    return { value: undefined }
  })
  on('agent.list', () => ({
    value: [{ id: 'a1', description: 'finished task', type: 'Explore', status: 'completed' }],
  }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.advance(TICK_MS)

  expect(stored.at(-1)?.[0]).toMatchObject({ id: 'a1', sessionId: 'me', sessionLabel: 'mine' })
})

test('the orchestrator is headed by the session label and counts in the stat tiles', async ($, on) => {
  on('session.cwd', () => ({ value: 'C:/work/mine' }))
  await startMainLoop($, on)

  await $.turn.start({ text: 'build it', turnId: 't1' })
  await $.turn.complete({ answer: '', durationMs: 5, isAborted: false, turnId: 't1', reason: 'answer', usage: USAGE })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: / mine/ })).toBeTruthy()
  expect(await textsOf(ui, /^2k$/)).toEqual(['2k'])
  expect(await textsOf(ui, /^≈\$0\.02$/)).toEqual([USAGE_COST])
  await ui.unmount()
})

test('the band caption row keeps clear of the worker mascot', async ($, on) => {
  on('command.register', () => ({ value: RUN_AGENTS }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('agent.list', () => ({ value: [] }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const caption = await ui.find({ type: 'Box', key: 'band-caption' })
  expect(Number(caption?.props.marginTop)).toBeGreaterThan(0)
  expect(Number(caption?.props.marginRight)).toBeGreaterThan(0)
  expect(Number(caption?.props.gap)).toBe(2)
  await ui.unmount()

  const terminal = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await terminal.find({ type: 'Button', text: /Agents/ })).toBeTruthy()
  await terminal.unmount()
})

test('main-loop steps record the orchestrator model and effort, a sub-agent step does not', async ($, on) => {
  on('turn.step', async function* (_, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage: null }
  })
  await startMainLoop($, on, [
    { id: 'a1', description: 'review the diff', type: 'general-purpose', status: 'running' },
  ])

  const step = { turnId: 't1', index: 0, messageCount: 1 }
  for await (const chunk of $.turn.step({ ...step, model: 'claude-opus-5-5', effort: 'high' })) {
    expect(chunk).toBeDefined()
  }
  for await (const chunk of $.turn.step({ ...step, model: 'claude-haiku-5-5', effort: 'low', agentId: 'a1' })) {
    expect(chunk).toBeDefined()
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await openDetails(ui, 'main', 'a1')
  const [orchestrator, worker] = await textsOf(ui, /→.*→.*→/)
  expect(orchestrator).toBe('Orchestrator → Opus 5.5 → High → Waiting')
  expect(worker).toContain('Haiku 5.5 → Low')
  await ui.unmount()
})

const PANE_OPEN_KEY = 'paneOpen'

const backedStore = (on: On, initial: Record<string, unknown> = {}) => {
  const kept = new Map(Object.entries(initial))
  on('store.get', (_, e) => ({ value: kept.get(e.key) }))
  on('store.set', (_, e) => {
    kept.set(e.key, e.value)

    return { value: undefined }
  })

  return kept
}

const trackPane = (on: On) => {
  const opened: string[] = []
  let openIds: string[] = []
  on('ui.panes', () => ({ value: openIds.map(id => ({ id, title: id, isShown: true, isFocused: false, isPlaced: true })) }))
  on('ui.open', (_, e) => {
    opened.push(e.id)
    openIds = [e.id]

    return { value: { isPlaced: true } }
  })
  on('ui.close', () => {
    openIds = []

    return { value: undefined }
  })

  return opened
}

const startPaneSession = async ($: Engine, on: On, initial: Record<string, unknown> = {}) => {
  const kept = backedStore(on, initial)
  const opened = trackPane(on)
  on('command.register', () => ({ value: RUN_AGENTS }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('env.get', () => ({ value: undefined }))
  on('agent.list', () => ({ value: [] }))
  const start = () => $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  return { kept, opened, start }
}

test('a pane opened by the command is opened again when the next session starts', async ($, on) => {
  const { kept, opened, start } = await startPaneSession($, on)

  await start()
  expect(opened).toEqual([])
  await $.command.run(RUN_AGENTS)
  expect(kept.get(PANE_OPEN_KEY)).toBe(true)

  await start()
  expect(opened).toEqual(['agent-workers', 'agent-workers'])
})

test('closing with the toggle forgets the preference, so the next session opens nothing', async ($, on) => {
  const { kept, opened, start } = await startPaneSession($, on)

  await start()
  await $.command.run(RUN_AGENTS)
  await $.command.run(RUN_AGENTS)
  expect(kept.get(PANE_OPEN_KEY)).toBe(false)

  await start()
  expect(opened).toEqual(['agent-workers'])
})

test('an unset preference does not open the pane at session start', async ($, on) => {
  const { opened, start } = await startPaneSession($, on)

  await start()
  expect(opened).toEqual([])
})

const OWN_SNAPSHOT = {
  version: 2,
  sessionId: 'me',
  label: 'Build the dashboard',
  cwd: 'C:/work/mine',
  heartbeat: CLOCK_START - TICK_MS,
  orchestrator: { id: 'main', role: 'orchestrator', status: 'running', model: 'claude-opus-5-5', cost: 2 },
  workers: [
    { id: 'gone', title: 'vanished task', status: 'running', cost: 0.5, startedAt: CLOCK_START - 5000 },
    { id: 'kept', title: 'live task', status: 'running', cost: 0.25, startedAt: CLOCK_START - 5000 },
  ],
}

const startResumed = async ($: Engine, on: On, snapshot: unknown, written: Record<string, string> = {}) => {
  const clock = mock.clock(on, { now: CLOCK_START })
  const history: unknown[][] = []
  on('command.register', () => ({ value: RUN_AGENTS }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  on('env.get', (_, e) => ({ value: e.name === 'USERPROFILE' ? 'C:/home' : undefined }))
  on('session.id', () => ({ value: 'me' }))
  on('session.cwd', () => ({ value: 'C:/work/mine' }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', (_, e) => {
    history.push(e.value as unknown[])

    return { value: undefined }
  })
  on('fs.write', (_, e) => {
    written[e.path] = e.text

    return { value: undefined }
  })
  on('fs.list', () => ({ value: [] }))
  on('fs.read', (_, e) => ({ value: e.path.endsWith('me.json') ? JSON.stringify(snapshot) : '{}' }))
  on('agent.list', () => ({
    value: [{ id: 'kept', description: 'live task', type: 'general-purpose', status: 'running' }],
  }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  return { clock, history }
}

test('a resumed session is seeded from its own snapshot, with the orchestrator idle', async ($, on) => {
  await startResumed($, on, OWN_SNAPSHOT)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Build the dashboard/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /live task/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /vanished task/ })).toBeTruthy()
  await openDetails(ui, 'main')
  expect(await textsOf(ui, /^Running$/)).toHaveLength(0)
  expect(await textsOf(ui, /^Waiting$/)).toHaveLength(1)
  expect((await textsOf(ui, /≈\$2\.00/)).length).toBeGreaterThan(0)
  await ui.unmount()
})

test('on the first tick a restored worker missing from the agent list is finished at its last known time', async ($, on) => {
  const { clock, history } = await startResumed($, on, OWN_SNAPSHOT)
  await clock.advance(TICK_MS)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Button', text: /Running · 1/ })).toBeTruthy()
  await ui.unmount()
  const archivedGone = history.at(-1)?.find(entry => (entry as { id: string }).id === 'gone')
  expect(archivedGone).toMatchObject({ status: 'completed', endedAt: OWN_SNAPSHOT.heartbeat, sessionId: 'me' })
  expect(history.at(-1)?.some(entry => (entry as { id: string }).id === 'kept')).toBe(false)
})

test('a snapshot of another session, or an unreadable one, seeds nothing', async ($, on) => {
  await startResumed($, on, { ...OWN_SNAPSHOT, sessionId: 'someone-else' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /vanished task/ })).toBeUndefined()
  await ui.unmount()
})

test('session.end writes the snapshot with a zero heartbeat but keeps workers and orchestrator', async ($, on) => {
  const written: Record<string, string> = {}
  await startResumed($, on, OWN_SNAPSHOT, written)

  await $.session.end({ reason: 'other', sessionId: 'me', resume: { id: 'me' } })

  const ended = JSON.parse(Object.entries(written).find(([path]) => path.endsWith('me.json'))?.[1] ?? 'null')
  expect(ended).toMatchObject({ sessionId: 'me', heartbeat: 0, label: 'Build the dashboard' })
  expect(ended.workers.map((worker: { id: string }) => worker.id)).toEqual(['gone', 'kept'])
  expect(ended.orchestrator).toMatchObject({ id: 'main' })
})

test('a pane that throws while drawing shows a short notice instead of nothing', async ($, on) => {
  const logged: string[] = []
  on('ui.log', (_, e) => {
    logged.push(e.text)

    return { value: undefined }
  })
  // A working directory that is not text makes the label helper throw inside the draw.
  on('session.cwd', () => ({ value: 42 as unknown as string }))
  await startWithAgents($, on, [])

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Agents pane failed to draw/ })).toBeTruthy()
  expect(logged.join(' ')).toContain('Agents pane failed to draw')
  await ui.unmount()
})

const RUNNING_AGENT: AgentInfo = {
  id: 'a1',
  description: 'review the diff',
  type: 'general-purpose',
  status: 'running',
}
const SUB_AGENT_MARK = / tools/

test('counter-only tool calls reach the pane on the pane clock, status changes at once', async ($, on) => {
  const agents: AgentInfo[] = [RUNNING_AGENT]
  const clock = await startMainLoop($, on, agents)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await openDetails(ui, 'a1')
  expect((await textsOf(ui, SUB_AGENT_MARK))[0]).toContain('0 tools')

  for (const id of ['u1', 'u2', 'u3']) {
    await $.tool.call({ tool: 'Grep', tool_use_id: id, pattern: 'x', agentId: 'a1' })
  }
  await clock.advance(TICK_MS)
  expect((await textsOf(ui, SUB_AGENT_MARK))[0]).toContain('0 tools')
  expect(await textsOf(ui, /^Running$/)).toHaveLength(1)

  // A status change is published at once, counters included.
  agents[0] = { ...RUNNING_AGENT, status: 'completed' }
  await clock.advance(TICK_MS)
  expect(await textsOf(ui, /^Running$/)).toHaveLength(0)
  expect(await ui.find({ type: 'Text', text: /No workers running\./ })).toBeTruthy()
  await ui.press({ key: 'history' })
  await ui.press({ key: 'children:history:main' })
  expect((await textsOf(ui, SUB_AGENT_MARK))[0]).toContain('3 tools')
  expect(await textsOf(ui, /^Completed$/)).toHaveLength(1)
  await ui.unmount()
})

test('worker counters wait for the pane clock, a new worker does not', async ($, on) => {
  const agents: AgentInfo[] = [RUNNING_AGENT]
  const clock = await startMainLoop($, on, agents)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await openDetails(ui, 'a1')

  await $.tool.call({ tool: 'Grep', tool_use_id: 'u1', pattern: 'x', agentId: 'a1' })
  expect((await textsOf(ui, SUB_AGENT_MARK))[0]).toContain('0 tools')

  // Events of an agent the list does not know yet create its card immediately.
  await $.tool.call({ tool: 'Grep', tool_use_id: 'u2', pattern: 'x', agentId: 'a2' })
  expect(await ui.find({ type: 'Text', text: /a2/ })).toBeTruthy()

  await clock.advance(PANE_CLOCK_MS)
  expect((await textsOf(ui, SUB_AGENT_MARK))[0]).toContain('1 tools')
  await ui.unmount()
})

test('main-loop counters wait for the pane clock, a turn start and end do not', async ($, on) => {
  const clock = await startMainLoop($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await openDetails(ui, 'main')

  await $.turn.start({ text: 'go', turnId: 't1' })
  expect(await textsOf(ui, /^Running$/)).toHaveLength(1)
  await $.tool.call({ tool: 'Read', tool_use_id: 'u1', file_path: 'a.ts' })
  await $.tool.call({ tool: 'Read', tool_use_id: 'u2', file_path: 'b.ts' })
  expect((await textsOf(ui, SUB_AGENT_MARK))[0]).toContain('0 tools')

  await clock.advance(PANE_CLOCK_MS)
  expect((await textsOf(ui, SUB_AGENT_MARK))[0]).toContain('2 tools')

  await $.tool.call({ tool: 'Read', tool_use_id: 'u3', file_path: 'c.ts' })
  await $.turn.complete({ answer: 'ok', durationMs: 5, isAborted: false, turnId: 't1', reason: 'answer', usage: USAGE })
  expect(await textsOf(ui, /^Idle$/)).toHaveLength(1)
  expect((await textsOf(ui, SUB_AGENT_MARK))[0]).toContain('3 tools')
  await ui.unmount()
})

test('elapsed times move on the pane clock, not every second', async ($, on) => {
  const clock = await startMainLoop($, on, [RUNNING_AGENT])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const compact = /^≈\$0\.00 · \d+:\d\d$/
  const elapsedTexts = async () => (await textsOf(ui, compact)).map(text => text.split(' · ')[1])
  expect(await elapsedTexts()).toEqual(['0:00', '0:00'])

  await clock.advance(PANE_CLOCK_MS - TICK_MS)
  expect(await elapsedTexts()).toEqual(['0:00', '0:00'])
  await clock.advance(TICK_MS)
  expect(await elapsedTexts()).toEqual(['0:05', '0:05'])
  await ui.unmount()
})

test('a draw makes no session.cwd or session.id round trip', async ($, on) => {
  let roundTrips = 0
  on('session.cwd', () => {
    roundTrips += 1

    return { value: 'C:/work/mine' }
  })
  on('session.id', () => {
    roundTrips += 1

    return { value: 'me' }
  })
  const clock = await startMainLoop($, on, [RUNNING_AGENT])
  roundTrips = 0

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: / mine/ })).toBeTruthy()
    await ui.press({ key: 'history' })
    await ui.press({ key: 'running' })
    await ui.unmount()
  }
  await clock.advance(PANE_CLOCK_MS)
  expect(roundTrips).toBe(0)
})

test('on desktop, the sub-agent arrow expands and collapses the children', async ($, on) => {
  await startWithAgents($, on, NESTED_AGENTS)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const svgCount = async () => (await ui.findAll({ type: 'Svg' })).length
  const expandedCount = await svgCount()

  expect(await textsOf(ui, ROLE_NAMES)).toEqual(['Claude', 'Iris', 'Penny'])
  await ui.press({ key: 'children:running:main' })
  expect(await textsOf(ui, ROLE_NAMES)).toEqual(['Claude'])
  expect(await ui.find({ type: 'Button', text: /▸ 1 sub-agent/ })).toBeTruthy()
  expect(await svgCount()).toBeLessThan(expandedCount)
  await ui.press({ key: 'children:running:main' })
  expect(await textsOf(ui, ROLE_NAMES)).toEqual(['Claude', 'Iris', 'Penny'])
  await ui.press({ key: 'history' })
  expect(await textsOf(ui, ROLE_NAMES)).toEqual(['Claude'])
  await ui.press({ key: 'children:history:main' })
  expect(await textsOf(ui, ROLE_NAMES)).toEqual(['Claude', 'Iris'])
  await ui.press({ key: 'children:history:a1' })
  expect(await textsOf(ui, ROLE_NAMES)).toEqual(['Claude', 'Iris', 'Penny'])
  await ui.press({ key: 'running' })
  expect(await textsOf(ui, ROLE_NAMES)).toEqual(['Claude', 'Iris', 'Penny'])
  await ui.unmount()
})

test('a tab press switches the pane content', async ($, on) => {
  await startWithAgents($, on, [{ ...RUNNING_AGENT, status: 'completed' }])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /No workers running\./ })).toBeTruthy()
  await ui.press({ key: 'history' })
  expect(await ui.find({ type: 'Text', text: /No workers running\./ })).toBeUndefined()
  expect(await ui.find({ type: 'Button', text: /History · 1/ })).toBeTruthy()
  await ui.press({ key: 'children:history:main' })
  expect(await textsOf(ui, ROLE_NAMES)).toEqual(['Claude', 'Iris'])
  await ui.press({ key: 'running' })
  expect(await ui.find({ type: 'Text', text: /No workers running\./ })).toBeTruthy()
  await ui.unmount()
})

const BAR_MARK = /width="\d+" height="16"/
const isBar = (source: string) => BAR_MARK.test(source)

test('busy cards draw a filling bar, finished cards a fully lit one', async ($, on) => {
  const agents: AgentInfo[] = [RUNNING_AGENT]
  const clock = await startWithAgents($, on, agents)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const busyBars = (await svgSources(ui)).filter(isBar)
  expect(busyBars.some(source => source.includes('fill="freeze"'))).toBe(true)
  expect(busyBars.every(source => source.includes('opacity="0.12"'))).toBe(true)

  agents[0] = { ...RUNNING_AGENT, status: 'completed' }
  await clock.advance(TICK_MS)
  await ui.press({ key: 'history' })
  await ui.press({ key: 'children:history:main' })
  const bars = (await svgSources(ui)).filter(isBar)
  const finished = bars.filter(source => !source.includes('<animate'))
  expect(finished.length).toBeGreaterThan(0)
  expect(finished.some(source => !source.includes('opacity="0.12"'))).toBe(true)
  await ui.unmount()
})

test('remote counters reach the pane on the pane clock, a remote status change at once', async ($, on) => {
  const clock = mock.clock(on, { now: CLOCK_START })
  let at = CLOCK_START
  let workerCost = 0.5
  let workerStatus = 'running'
  const remote = () => ({
    ...remoteSnapshot(at),
    workers: [{ id: 'w1', title: 'remote task', status: workerStatus, cost: workerCost }],
  })
  on('command.register', () => ({ value: RUN_AGENTS }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('agent.list', () => ({ value: [] }))
  on('env.get', (_, e) => ({ value: e.name === 'USERPROFILE' ? 'C:/home' : undefined }))
  on('store.get', () => ({ value: undefined }))
  on('session.id', () => ({ value: 'me' }))
  on('session.cwd', () => ({ value: 'C:/work/mine' }))
  on('fs.write', () => ({ value: undefined }))
  on('fs.list', () => ({
    value: [{ name: 'other.json', kind: 'file', size: 1, mtimeMs: at, isLink: false }],
  }))
  on('fs.read', () => ({ value: JSON.stringify(remote()) }))
  const advance = async (ms: number) => {
    at += ms
    await clock.advance(ms)
  }

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await advance(SYNC_MS)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Opus 5\.5 · Waiting · ≈\$1\.50/ })).toBeTruthy()

  // The remote worker's cost moves every sync, but the pane only hears of it on the pane clock.
  workerCost = 3
  await advance(SYNC_MS)
  expect(await ui.find({ type: 'Text', text: /≈\$1\.50/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /≈\$4\.00/ })).toBeUndefined()
  await advance(PANE_CLOCK_MS)
  expect(await ui.find({ type: 'Text', text: /≈\$4\.00/ })).toBeTruthy()

  // A status change is drawn at the next sync, counters with it.
  workerCost = 5
  workerStatus = 'waiting'
  await advance(SYNC_MS)
  expect(await ui.find({ type: 'Text', text: /Waiting · ≈\$5\.00/ })).toBeTruthy()
  await ui.unmount()
})
