import { atom, read, update } from 'claude-code'
import type { Register, StateDollar } from 'claude-code'

import type {
  ArchivedWorker,
  DashboardTab,
  SessionSnapshot,
  SessionTotals,
  Worker,
  WorkerActivity,
  WorkerStatus,
} from '../types'
import { readableColor } from './colors'
import { BAND_HEIGHT, BAR_ROW_HEIGHT, MASCOT_W, avatarSvg, avatarWidth, bandSvg, barSvg, barWidth } from './mascot'
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
import { PANE_OPEN_STORE_KEY, isPaneDismissal } from './pane'
import { sameSnapshotsStructure, sameWorkerStructure, sameWorkersStructure } from './publish'
import { agentName, classify, roleById } from './roles'
import {
  SESSIONS_SUBDIR,
  SNAPSHOT_VERSION,
  SYNC_MS,
  endedSnapshot,
  finishVanished,
  customTitleOf,
  firstPrompt,
  historyEntries,
  isFileRecent,
  isSessionFile,
  isWithinHistory,
  liveSnapshots,
  parseSnapshotText,
  pastSessionGroups,
  pastSessionRoot,
  projectFolderName,
  promptTitle,
  restoredOrchestrator,
  restoredTitle,
  restoredUnfinished,
  sameSnapshots,
  sessionFileName,
  sessionEntries,
  sessionLabel,
  shouldPublish,
  snapshotContentKey,
} from './sessions'
import { FINISHED, activityOf, isBusy, isFailed, isRunning } from './status'
import { clip, formatCount, formatDuration } from './text'
import type { TreeNode } from './tree'
import { branchGutter, buildTree, descendants, hasChildren, subtreeCost, trunkText } from './tree'

const PANE = 'agent-workers'
const PANE_TITLE = 'Agents'
const COMMAND = 'agent-dashboard'
const NESTED_AVATAR_PX = 36
// Cells a child's branch gutter (`├─`) takes before its card, and the one-cell trunk offset of a text row.
const BRANCH_CELLS = 3
const BRANCH_GUTTER_CELLS = 2
const SIBLING_GAP_ROWS = 1
const TERMINAL_TRUNK_OFFSET = 1
const REMOTE_TRUNK_OFFSET = 1
const TITLE_CHARS = 30
const MIN_TITLE_CHARS = 8
const TITLE_RESERVE_CELLS = 3
const ARROW_OPEN = '▾'
const ARROW_CLOSED = '▸'
const CONTROL_GAP = 2
const BAND_CAPTION_MARGIN_TOP = 1
const BORDER_COLOR = '#9ca3af'
const FAILED_BAR_COLOR = '#dc2626'
const NO_AGENTS_CAPTION = 'No agents running'
const BAR_ROW_CELLS = 1
const BAR_ALTS: Record<WorkerActivity, string> = {
  busy: 'in progress',
  asleep: 'waiting',
  finished: 'finished',
}
// Pixel widths are estimated from the surface's character columns; tune CELL_PX
// if the band or the bars come out narrower or wider than the chat.
const CELL_PX = 7.5
const PANE_FALLBACK_PX = 420
const PANE_MARGIN_PX = 40
const BAND_FALLBACK_PX = 640
const BAND_MARGIN_PX = 24
const MIN_SURFACE_PX = 240
const MIN_BAR_PX = 120
const AVATAR_PX = 56
// Progress bars keep one small width: the pane's width is not known reliably while it is resized.
const BAR_PX = 96
// Cells the band caption row keeps clear at its right end: the worker mascot's width.
const BAND_MASCOT_CELLS = Math.ceil(MASCOT_W / CELL_PX)
const CARD_GAP_PX = 12
const TICK_MS = 1000
// The pane's clock: elapsed times, counters and remote counters reach it this often, not every second.
const PANE_CLOCK_MS = 5000
// Idle, the tick polls agents and redraws the clock this rarely: nothing moves meanwhile.
const IDLE_TICK_MS = 5000
const IDLE_CLOCK_MS = 60_000
// Other sessions' files change rarely; the history rereads them this often.
const HISTORY_REFRESH_MS = 5 * 60_000
// The transcript (often megabytes) is read for the app's session name every 30 s until
// it has one, then every 5 min to catch a rename.
const TITLE_REFRESH_MS = 30_000
const TITLE_RENAME_MS = 5 * 60_000
const MAX_WORKERS = 60
const TOKENS_PER_M = 1_000_000
const CACHE_READ_RATE = 0.1
const CACHE_WRITE_RATE = 1.25
// After the last busy worker, the pane clock keeps running this long so the final figures settle.
const CLOCK_LINGER_MS = PANE_CLOCK_MS
const SUMMARY_CHARS = 180
const HISTORY_FILES = 6
const REMOTE_TITLE_CHARS = 30

// Mid-tone colors; `readableColor` pulls each into a range legible on light and dark.
const NEUTRAL_COLOR = '#94a3b8'
const SUCCESS_COLOR = '#4ade80'
const EFFORT_COLORS: Record<string, string> = {
  low: NEUTRAL_COLOR,
  medium: '#38bdf8',
  high: '#a78bfa',
  xhigh: '#f472b6',
  max: '#fb7185',
}
const STATUS_COLORS: Record<string, string> = {
  running: '#fbbf24',
  pending: '#fbbf24',
  waiting: '#fbbf24',
  idle: NEUTRAL_COLOR,
  completed: SUCCESS_COLOR,
  failed: '#f87171',
  killed: '#f87171',
}

// Estimated list prices in USD per million tokens, [name, input, output]. Costs
// shown are approximations built from these, never a bill.
const PRICES: Array<[string, number, number]> = [
  ['opus', 5, 25],
  ['sonnet', 3, 15],
  ['haiku', 1, 5],
  ['fable', 10, 50],
]
const DEFAULT_PRICE: [string, number, number] = ['', 3, 15]

// `workers` and `main` are what the pane draws, and every write to them redraws it.
// Events write `liveWorkers` and `liveMain`, which no draw reads, and publish into
// the drawn atoms at once only for what is more than counters; counters follow on
// the pane clock. Atoms, not module variables, so a hot reload keeps the live copy.
const workers = atom({ plugin: 'agent-dashboard', key: 'workers' } as const, [])
const main = atom({ plugin: 'agent-dashboard', key: 'main' } as const, newOrchestrator())
const liveWorkers = atom({ plugin: 'agent-dashboard', key: 'liveWorkers' } as const, [])
const liveMain = atom({ plugin: 'agent-dashboard', key: 'liveMain' } as const, newOrchestrator())
const currentCwd = atom({ plugin: 'agent-dashboard', key: 'sessionCwd' } as const, '')
const currentSessionId = atom({ plugin: 'agent-dashboard', key: 'sessionId' } as const, '')
const lastRunningAt = atom({ plugin: 'agent-dashboard', key: 'lastRunningAt' } as const, 0)
const now = atom({ plugin: 'agent-dashboard', key: 'now' } as const, 0)
const tab = atom({ plugin: 'agent-dashboard', key: 'tab' } as const, 'running')
const archive = atom({ plugin: 'agent-dashboard', key: 'archive' } as const, [])
const childrenOpen = atom({ plugin: 'agent-dashboard', key: 'childrenOpen' } as const, {})
const detailOpen = atom({ plugin: 'agent-dashboard', key: 'detailOpen' } as const, [])
const otherSessions = atom({ plugin: 'agent-dashboard', key: 'otherSessions' } as const, [])
const sessionTitle = atom({ plugin: 'agent-dashboard', key: 'sessionTitle' } as const, '')
const totals = atom({ plugin: 'agent-dashboard', key: 'totals' } as const, { usd: null, startedAt: 0 } as SessionTotals)

type Usage = {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
  model?: string
}

function estimateCost(usage: Usage): number {
  const model = (usage.model ?? '').toLowerCase()
  const [, input, output] = PRICES.find(([name]) => model.includes(name)) ?? DEFAULT_PRICE
  const inputTokens =
    usage.input_tokens +
    usage.cache_read_input_tokens * CACHE_READ_RATE +
    usage.cache_creation_input_tokens * CACHE_WRITE_RATE

  return (inputTokens * input + usage.output_tokens * output) / TOKENS_PER_M
}

function totalTokens(usage: Usage): number {
  return (
    usage.input_tokens +
    usage.output_tokens +
    usage.cache_read_input_tokens +
    usage.cache_creation_input_tokens
  )
}

/** `claude-haiku-5-5` becomes `Haiku 5.5`; an id it does not know is shown as is. */
function modelLabel(model: string): string {
  const match = /claude-(?:(\d+)-(\d+)-)?([a-z]+)(?:-(\d+)(?:-(\d{1,2}))?)?(?:-\d{8})?$/.exec(model)
  if (!match) {
    return model || '—'
  }
  const [, preMajor, preMinor, family = '', major, minor] = match
  const name = family.charAt(0).toUpperCase() + family.slice(1)
  const version = preMajor ? `${preMajor}.${preMinor}` : major ? (minor ? `${major}.${minor}` : major) : ''

  return version ? `${name} ${version}` : name
}

function effortLabel(effort: string): string {
  return effort ? effort.charAt(0).toUpperCase() + effort.slice(1) : '—'
}

function statusLabel(status: WorkerStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function summarize(answer: string): string {
  return clip(answer.replace(/\s+/g, ' ').trim(), SUMMARY_CHARS)
}

function money(value: number): string {
  return `≈$${value.toFixed(2)}`
}

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

function elapsed(worker: Worker, clockNow: number): string {
  if (worker.startedAt <= 0) {
    return formatDuration(0)
  }
  const end = worker.endedAt > 0 ? worker.endedAt : clockNow

  return formatDuration(end - worker.startedAt)
}

/** The tab's default for showing sub-agents: shown while running, hidden in history. */
function isOpenByDefault(activeTab: DashboardTab): boolean {
  return activeTab === 'running'
}

function childrenKey(activeTab: DashboardTab, id: string): string {
  return `${activeTab}:${id}`
}

/**
 * How long the worker has been at it, for its progress bar. A sub-agent counts
 * from its start; the orchestrator from the start of its current turn (none yet
 * means no progress).
 */
function progressElapsedMs(worker: Worker, clockNow: number): number {
  const since = worker.id === ORCHESTRATOR_ID ? (worker.busySince ?? 0) : worker.startedAt

  return since > 0 ? Math.max(0, clockNow - since) : 0
}

function clockTime(stamp: number): string {
  const date = new Date(stamp)
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function newWorker(id: string, startedAt: number): Worker {
  return {
    id,
    parentId: '',
    title: id,
    type: 'agent',
    role: 'builder',
    model: '',
    effort: '',
    status: 'running',
    tools: 0,
    lastTool: '',
    files: [],
    tokens: 0,
    cost: 0,
    lastCallCost: 0,
    summary: '',
    startedAt,
    endedAt: 0,
  }
}

function patchWorker(
  list: Worker[],
  id: string,
  startedAt: number,
  patch: (worker: Worker) => Worker,
): Worker[] {
  const isKnown = list.some(worker => worker.id === id)
  const base = isKnown ? list : [...list, newWorker(id, startedAt)]

  return base.map(worker => (worker.id === id ? patch(worker) : worker)).slice(-MAX_WORKERS)
}

type PaneControls = {
  ui: {
    panes: () => Promise<readonly { id: string }[]>
    open: (pane: { id: string; title: string }) => Promise<unknown>
    close: (pane: { id: string }) => Promise<void>
  }
  store: { set: (key: string, value: unknown) => Promise<unknown> }
}

/** Keeps whether the person wants the pane, so later sessions open it too. */
async function rememberPane($: Pick<PaneControls, 'store'>, isOpen: boolean): Promise<void> {
  await $.store.set(PANE_OPEN_STORE_KEY, isOpen).catch(() => undefined)
}

/** Opens the pane, or closes it when already open; answers whether it is open now. */
async function togglePane($: PaneControls): Promise<boolean> {
  const isOpen = (await $.ui.panes()).some(pane => pane.id === PANE)
  if (isOpen) {
    await $.ui.close({ id: PANE })
    await rememberPane($, false)

    return false
  }
  await $.ui.open({ id: PANE, title: PANE_TITLE })
  await rememberPane($, true)

  return true
}

function surfaceWidth(columns: number | undefined, fallback: number, margin: number): number {
  return Math.max(MIN_SURFACE_PX, columns ? Math.round(columns * CELL_PX) - margin : fallback)
}

function sameWorkers(a: Worker[], b: Worker[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Draws `live` when it is more than counters different (or any different, when `isForced`). */
async function publishWorkers($: StateDollar, live: Worker[], isForced = false): Promise<void> {
  const shown = await read($, workers)
  if (isForced ? !sameWorkers(live, shown) : !sameWorkersStructure(live, shown)) {
    await update($, workers, () => live)
  }
}

async function publishMain($: StateDollar, live: Worker, isForced = false): Promise<void> {
  const shown = await read($, main)
  if (isForced ? !sameWorkers([live], [shown]) : !sameWorkerStructure(live, shown)) {
    await update($, main, () => live)
  }
}

/** Brings the drawn workers and orchestrator up to date, counters included. */
async function publishAll($: StateDollar): Promise<void> {
  const [liveList, liveAgent] = await Promise.all([read($, liveWorkers), read($, liveMain)])
  await publishWorkers($, liveList, true)
  await publishMain($, liveAgent, true)
}

/** Changes the live workers; the pane redraws only when the change is more than counters. */
async function patchWorkers($: StateDollar, change: (list: Worker[]) => Worker[]): Promise<void> {
  await publishWorkers($, await update($, liveWorkers, change))
}

/** Changes the live orchestrator when `change` alters it; the pane redraws only for more than counters. */
async function patchMain($: StateDollar, change: (current: Worker) => Worker): Promise<void> {
  const current = await read($, liveMain)
  if (JSON.stringify(change(current)) !== JSON.stringify(current)) {
    await publishMain($, await update($, liveMain, change))
  }
}

/**
 * A hot reload keeps atoms but loses code: state drawn by an older version has no
 * live copy yet, so the live copy starts from it rather than from nothing.
 */
async function adoptDrawnState($: StateDollar): Promise<void> {
  const [liveList, liveAgent, shownList, shownAgent] = await Promise.all([
    read($, liveWorkers),
    read($, liveMain),
    read($, workers),
    read($, main),
  ])
  if (liveList.length === 0 && shownList.length > 0) {
    await update($, liveWorkers, () => shownList)
  }
  if (liveAgent.startedAt === 0 && shownAgent.startedAt > 0) {
    await update($, liveMain, () => shownAgent)
  }
}

/** Overwrites live and drawn alike, for state that is restored rather than observed. */
async function seed($: StateDollar, list: Worker[], orchestrator: Worker): Promise<void> {
  await update($, liveWorkers, () => list)
  await update($, liveMain, () => orchestrator)
  await publishAll($)
}

type HistoryControls = {
  fs: {
    list: (path: string) => Promise<Array<{ name: string; kind: string; mtimeMs: number }>>
    read: (path: string) => Promise<unknown>
  }
}

/**
 * The history: every other session whose file was written within the last
 * HISTORY_DAYS, read from the session files (which survive reinstalls, unlike
 * `$.store`). Older files are left alone and never read.
 */
async function loadHistory(
  $: HistoryControls,
  directory: string | undefined,
  ownSessionId: string,
  stamp: number,
): Promise<ArchivedWorker[]> {
  if (!directory) {
    return []
  }
  const ownFile = sessionFileName(ownSessionId)
  const entries = await $.fs.list(directory).catch(() => [])
  const recent = entries.filter(
    entry => entry.kind === 'file' && isSessionFile(entry.name) && entry.name !== ownFile && isWithinHistory(entry.mtimeMs, stamp),
  )
  const parsed = await Promise.all(
    recent.map(entry =>
      $.fs
        .read(`${directory}/${entry.name}`)
        .then(raw => (typeof raw === 'string' ? parseSnapshotText(raw) : null))
        .catch(() => null),
    ),
  )

  return parsed.flatMap(snapshot => (snapshot ? historyEntries(snapshot) : []))
}

type SyncControls = {
  env: { get: (name: string) => Promise<string | undefined> }
}

/** `<claude config dir>/agent-dashboard/sessions`; the config dir is CLAUDE_CONFIG_DIR, else `~/.claude`. */
async function sessionsDirectory($: SyncControls): Promise<string | undefined> {
  const config = await configDirectory($)

  return config ? `${config}/${SESSIONS_SUBDIR}` : undefined
}

/** CLAUDE_CONFIG_DIR, else `~/.claude`. */
async function configDirectory($: SyncControls): Promise<string | undefined> {
  const configured = await $.env.get('CLAUDE_CONFIG_DIR').catch(() => undefined)
  if (configured) {
    return configured
  }
  const home =
    (await $.env.get('USERPROFILE').catch(() => undefined)) ?? (await $.env.get('HOME').catch(() => undefined))

  return home ? `${home}/.claude` : undefined
}

type TranscriptControls = {
  session: { messages: () => Promise<unknown> }
}

/** Claude Code exposes no session title, so the first prompt of the transcript stands in for it. */
async function firstPromptOf($: TranscriptControls): Promise<string> {
  const found = await $.session.messages().catch(() => [])

  return Array.isArray(found) ? firstPrompt(found) : ''
}

type TitleSource = {
  fs: {
    read: (path: string) => Promise<unknown>
    list: (path: string) => Promise<Array<{ name: string; kind: string }>>
    exists: (path: string) => Promise<boolean>
  }
}

/**
 * The session's transcript, `<config>/projects/<cwd as a folder name>/<id>.jsonl`.
 * A session that changed folder keeps its transcript under the first one, so the
 * other project folders are searched when the expected one has no file.
 */
async function findTranscript($: TitleSource, projects: string, cwd: string, sessionId: string): Promise<string | undefined> {
  const file = `${sessionId}.jsonl`
  const expected = `${projects}/${projectFolderName(cwd)}/${file}`
  if (await $.fs.exists(expected).catch(() => false)) {
    return expected
  }
  const folders = await $.fs.list(projects).catch(() => [])
  for (const folder of folders.filter(entry => entry.kind === 'dir')) {
    const path = `${projects}/${folder.name}/${file}`
    if (await $.fs.exists(path).catch(() => false)) {
      return path
    }
  }

  return undefined
}

type RestoreControls = StateDollar & {
  fs: { read: (path: string) => Promise<unknown> }
}

/**
 * A resumed session process starts with empty atoms, so its own snapshot file
 * (published every SYNC_MS) seeds them again. Answers when each restored
 * unfinished worker was last known alive; empty when there is nothing to restore.
 */
async function restoreOwnSnapshot(
  $: RestoreControls,
  directory: string | undefined,
  sessionId: string,
): Promise<Map<string, number>> {
  if (!directory || sessionId === '') {
    return new Map()
  }
  const raw = await $.fs.read(`${directory}/${sessionFileName(sessionId)}`).catch(() => null)
  const snapshot = typeof raw === 'string' ? parseSnapshotText(raw) : null
  if (!snapshot || snapshot.sessionId !== sessionId) {
    return new Map()
  }
  await seed($, snapshot.workers, restoredOrchestrator(snapshot))
  await update($, sessionTitle, () => restoredTitle(snapshot))

  return restoredUnfinished(snapshot)
}

type SnapshotParts = {
  sessionId: string
  title: string
  cwd: string
  orchestrator: Worker
  workers: Worker[]
  heartbeat: number
}

function buildSnapshot(parts: SnapshotParts): SessionSnapshot {
  const { sessionId, title, cwd, orchestrator, workers: list, heartbeat } = parts
  const label = sessionLabel(title, cwd)

  return {
    version: SNAPSHOT_VERSION,
    sessionId,
    label,
    cwd,
    orchestrator: { ...orchestrator, title: label },
    heartbeat,
    workers: list,
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // A refused name (a built-in's, as `/agents` is) must not stop the tick below.
    await $.command
      .register({ name: COMMAND, description: 'Show or hide the Agents pane' })
      .catch(() => undefined)

    // Desktop keeps the pane slot across sessions, but only an opened pane gets drawn.
    if ((await $.store.get(PANE_OPEN_STORE_KEY).catch(() => undefined)) === true) {
      void $.ui.open({ id: PANE, title: PANE_TITLE }).catch(() => undefined)
    }

    // Read once here: a draw must not wait on round trips for them.
    const [initialCwd, initialSessionId] = await Promise.all([
      $.session.cwd().catch(() => ''),
      $.session.id().catch(() => ''),
    ])
    await update($, currentCwd, () => initialCwd)
    await update($, currentSessionId, () => initialSessionId)

    const directory = await sessionsDirectory($)
    // Workers restored from this session's own file; the first tick settles those the engine no longer lists.
    let restoredAt = await restoreOwnSnapshot($, directory, initialSessionId)

    // Writes only what changed: every write to a drawn atom redraws the pane, and a
    // pane redrawn each second while agents run swallowed presses on its buttons.
    // So the tick publishes status changes at once and everything else (counters,
    // the pane clock) every PANE_CLOCK_MS.
    let isAdopted = false
    let lastPollAt = 0
    $.clock.every(TICK_MS, async () => {
      if (!isAdopted) {
        isAdopted = true
        await adoptDrawnState($)
      }
      const [stamp, seenRunningAt, mainAgent] = await Promise.all([$.clock.now(), read($, lastRunningAt), read($, liveMain)])
      // With nothing running for a while, poll every IDLE_TICK_MS instead of every second.
      const wasRecentlyBusy = isBusy(mainAgent) || stamp - seenRunningAt < CLOCK_LINGER_MS + TICK_MS
      if (!wasRecentlyBusy && stamp - lastPollAt < IDLE_TICK_MS) {
        return
      }
      lastPollAt = stamp
      const [agents, current, paneStamp] = await Promise.all([$.agent.list(), read($, liveWorkers), read($, now)])
      const liveIds = new Set(agents.map(agent => agent.id))
      const mergeAgents = (list: Worker[]) =>
        agents.reduce(
          (acc, agent) =>
            patchWorker(acc, agent.id, stamp, worker => {
              const title = agent.description || agent.name || worker.title

              return {
                ...worker,
                title,
                parentId: agent.parentId ?? '',
                type: agent.type,
                role: classify(title, agent.type).id,
                status: agent.status,
                endedAt:
                  FINISHED.includes(agent.status) && worker.endedAt === 0 ? stamp : worker.endedAt,
              }
            }),
          list,
        )
      const merge = (list: Worker[]) => finishVanished(mergeAgents(list), restoredAt, liveIds)
      if (!sameWorkers(current, merge(current))) {
        await patchWorkers($, merge)
      }
      restoredAt = new Map()
      await patchMain($, current => withStart(current, stamp))
      // The main turn keeps the clock going too, so the orchestrator's elapsed time moves.
      const isAnyBusy = isBusy(mainAgent) || agents.some(agent => activityOf(agent.status) === 'busy')
      const isClockRunning = isAnyBusy || stamp - seenRunningAt < CLOCK_LINGER_MS + TICK_MS
      // Idle, the session clock still moves, once a minute.
      if (stamp - paneStamp >= (isClockRunning ? PANE_CLOCK_MS : IDLE_CLOCK_MS)) {
        await publishAll($)
        const usage = await $.session.usage().catch(() => null)
        if (usage) {
          const fresh: SessionTotals = { usd: usage.cost?.usd ?? null, startedAt: usage.startedAt }
          await update($, totals, current => (current.usd === fresh.usd && current.startedAt === fresh.startedAt ? current : fresh))
        }
        await update($, now, () => stamp)
      }
      if (isAnyBusy) {
        await update($, lastRunningAt, () => stamp)
      }
    })

    if (directory) {
      let published = { sessionId: '', key: '', heartbeat: 0 }
      let othersPublishedAt = 0
      let historyLoadedAt = -HISTORY_REFRESH_MS
      let titleCheckedAt = -TITLE_REFRESH_MS
      let transcriptPath: string | undefined
      let hasAppTitle = false

      // Publishes this session's snapshot, then reads the others'. Disk and atom
      // writes happen only when something changed (or a heartbeat is due).
      const sync = async () => {
        const [stamp, sessionId, cwd, list, mainAgent, knownTitle] = await Promise.all([
          $.clock.now(),
          $.session.id(),
          $.session.cwd(),
          read($, liveWorkers),
          read($, liveMain),
          read($, sessionTitle),
        ])
        if (cwd !== (await read($, currentCwd))) {
          await update($, currentCwd, () => cwd)
        }
        if (sessionId !== (await read($, currentSessionId))) {
          await update($, currentSessionId, () => sessionId)
        }
        let title = knownTitle
        if (stamp - titleCheckedAt >= (hasAppTitle ? TITLE_RENAME_MS : TITLE_REFRESH_MS)) {
          titleCheckedAt = stamp
          const config = await configDirectory($)
          transcriptPath ??= config ? await findTranscript($, `${config}/projects`, cwd, sessionId) : undefined
          const raw = transcriptPath ? await $.fs.read(transcriptPath).catch(() => '') : ''
          // The app's own name for the session; the gist of the first prompt until it has one.
          const appTitle = customTitleOf(typeof raw === 'string' ? raw : '')
          hasAppTitle = appTitle !== ''
          const named = appTitle || title || promptTitle(await firstPromptOf($))
          if (named !== title) {
            title = named
            await update($, sessionTitle, () => named)
          }
        }
        const snapshot = buildSnapshot({
          sessionId,
          title,
          cwd,
          orchestrator: mainAgent,
          heartbeat: stamp,
          workers: list,
        })
        const key = snapshotContentKey(snapshot)
        const isOwnFileDue =
          published.sessionId !== sessionId ||
          shouldPublish(published.key, key, published.heartbeat, stamp)
        if (isOwnFileDue) {
          // A refused write still lets this session read the others below.
          await $.fs
            .write(`${directory}/${sessionFileName(sessionId)}`, JSON.stringify(snapshot))
            .catch(() => undefined)
          published = { sessionId, key, heartbeat: stamp }
        }

        if (stamp - historyLoadedAt >= HISTORY_REFRESH_MS) {
          historyLoadedAt = stamp
          const past = await loadHistory($, directory, sessionId, stamp)
          await update($, archive, () => past)
        }

        const ownFile = sessionFileName(sessionId)
        const entries = await $.fs.list(directory).catch(() => [])
        const candidates = entries.filter(
          entry =>
            entry.kind === 'file' &&
            isSessionFile(entry.name) &&
            entry.name !== ownFile &&
            isFileRecent(entry.mtimeMs, stamp),
        )
        const parsed = await Promise.all(
          candidates.map(entry =>
            $.fs
              .read(`${directory}/${entry.name}`)
              .then(raw => (typeof raw === 'string' ? parseSnapshotText(raw) : null))
              .catch(() => null),
          ),
        )
        const live = liveSnapshots(
          parsed.filter((item): item is SessionSnapshot => item !== null),
          sessionId,
          stamp,
        )
        // Other sessions' counters change constantly: they redraw at the pane clock,
        // any other change (a session, a worker, a status) at once.
        const shown = await read($, otherSessions)
        const isCounterDue = stamp - othersPublishedAt >= PANE_CLOCK_MS && !sameSnapshots(shown, live)
        if (!sameSnapshotsStructure(shown, live) || isCounterDue) {
          await update($, otherSessions, () => live)
          othersPublishedAt = stamp
        }
      }
      // A refused or failed file operation must not take the whole tick down.
      $.clock.every(SYNC_MS, () => sync().catch(() => undefined))
    }

    return next(e)
  })

  on('session.end', async ($, e, next) => {
    const directory = await sessionsDirectory($)
    if (directory) {
      const [cwd, list, mainAgent, title] = await Promise.all([
        $.session.cwd().catch(() => ''),
        read($, liveWorkers),
        read($, liveMain),
        read($, sessionTitle),
      ])
      const live = buildSnapshot({
        sessionId: e.sessionId,
        title,
        cwd,
        orchestrator: mainAgent,
        workers: list,
        heartbeat: 0,
      })
      await $.fs
        .write(`${directory}/${sessionFileName(e.sessionId)}`, JSON.stringify(endedSnapshot(live)))
        .catch(() => undefined)
    }

    return next(e)
  })

  // A close by the person or the toggle is a choice; an `unload` is the engine's, not one.
  on('ui.close', async ($, e, next) => {
    if (e.id === PANE && isPaneDismissal(e.origin.kind)) {
      await rememberPane($, false)
    }

    return next(e)
  })

  on('command.run', { command: COMMAND }, async $ => {
    const isOpen = await togglePane($)

    return { text: isOpen ? 'Agents pane opened.' : 'Agents pane closed.' }
  })

  on('turn.start', async ($, e, next) => {
    if (!e.agentId) {
      const stamp = await $.clock.now()
      await patchMain($, current => startMainTurn(current, stamp))
    }

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const agentId = e.agentId
    const effort = e.effort === undefined ? undefined : String(e.effort)
    if (!agentId) {
      await patchMain($, current => recordModel(current, e.model, effort))
    } else {
      const known = (await read($, liveWorkers)).find(worker => worker.id === agentId)
      if (!known || known.model !== e.model || known.effort !== (effort ?? known.effort)) {
        const stamp = await $.clock.now()
        await patchWorkers($, list =>
          patchWorker(list, agentId, stamp, worker => recordModel(worker, e.model, effort)),
        )
      }
    }

    return yield* next(e)
  })

  on('tool.call', async ($, e, next) => {
    const path = (e as { file_path?: string }).file_path
    const agentId = e.agentId
    if (!agentId) {
      await patchMain($, current => recordToolCall(current, e.tool, path))

      return next(e)
    }
    const stamp = await $.clock.now()
    await patchWorkers($, list =>
      patchWorker(list, agentId, stamp, worker => recordToolCall(worker, e.tool, path)),
    )

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const usage = e.usage
    const cost = usage ? estimateCost(usage) : 0
    const agentId = e.agentId
    if (!agentId) {
      // Every end parks the orchestrator, an interrupted or failed turn (no usage) too.
      const spend = usage ? { model: usage.model, tokens: totalTokens(usage), cost } : undefined
      const answer = e.answer ? summarize(e.answer) : ''
      await patchMain($, current => endMainTurn(current, spend, answer))

      return next(e)
    }
    if (!usage) {
      return next(e)
    }
    const stamp = await $.clock.now()
    await patchWorkers($, list =>
      patchWorker(list, agentId, stamp, worker => ({
        ...worker,
        model: usage.model,
        tokens: worker.tokens + totalTokens(usage),
        cost: worker.cost + cost,
        lastCallCost: cost,
        summary: e.answer ? summarize(e.answer) : worker.summary,
      })),
    )

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    try {
      const [list, sessionId] = await Promise.all([read($, workers), read($, currentSessionId)])
      const busy = list.filter(isBusy)
      // The first busy worker holds the right edge until it stops, so the band does
      // not swap mascots as the others change; with none busy, the last one sleeps there.
      const active = busy[0] ?? list[list.length - 1]
      const role = active ? roleById(active.role) : null
      const isActive = busy.length > 0
      const { Box, Text, Button } = $.ui.resolve(e)
      const toggle = (
        <Button key="agents-toggle" variant="secondary" onPress={() => void togglePane($)}>
          Agents
        </Button>
      )
      const label = isActive && active ? `${money(active.lastCallCost)} · ${active.lastTool || 'thinking'}` : ''
      const roleColor = role ? readableColor(role.color) : undefined
      const activeName = active && role ? agentName(role.id, active.id) : ''
      const caption =
        isActive && active && role
          ? `${busy.length} running · ${activeName} · ${clip(active.title, 36)}`
          : role
            ? `${NO_AGENTS_CAPTION} · last: ${activeName}`
            : NO_AGENTS_CAPTION

      if (e.surface !== 'desktop') {
        return (
          <Box flexDirection="row" gap={CONTROL_GAP}>
            <Text color={isActive ? roleColor : undefined} dimColor={!isActive}>
              {label ? `${caption} · ${label}` : caption}
            </Text>
            {toggle}
          </Box>
        )
      }
      const { Svg } = $.ui.resolve(e)
      const width = surfaceWidth(e.viewport?.columns, BAND_FALLBACK_PX, BAND_MARGIN_PX)

      return (
        <Box flexDirection="column">
          <Svg
            source={bandSvg({ roleId: role?.id ?? null, width, isBusy: isActive, mainSeed: sessionId, workerSeed: active?.id ?? '' })}
            alt={isActive && role ? `Claude passing data to ${activeName}` : 'Claude and its agents, asleep'}
            width={width}
            height={BAND_HEIGHT}
            isInteractive
          />
          <Box
            key="band-caption"
            flexDirection="row"
            justifyContent="space-between"
            gap={CONTROL_GAP}
            marginTop={BAND_CAPTION_MARGIN_TOP}
            marginRight={BAND_MASCOT_CELLS}
          >
            <Text dimColor>{caption}</Text>
            <Box flexDirection="row" gap={CONTROL_GAP}>
              {label !== '' && <Text color={roleColor}>{label}</Text>}
              {toggle}
            </Box>
          </Box>
        </Box>
      )
    } catch (error) {
      $.ui.log(`Agents band failed to draw: ${errorText(error)}`, { to: 'debug' })

      return next(e)
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    try {
      const { Box, Text, Button } = $.ui.resolve(e)
      const [list, clockNow, mainAgent, activeTab, past, others, title, cwd, sessionId, openState, detailIds, sessionTotals] =
        await Promise.all([
          read($, workers),
          read($, now),
          read($, main),
          read($, tab),
          read($, archive),
          read($, otherSessions),
          read($, sessionTitle),
          read($, currentCwd),
          read($, currentSessionId),
          read($, childrenOpen),
          read($, detailOpen),
          read($, totals),
        ])
      const orchestrator: Worker = { ...mainAgent, title: sessionLabel(title, cwd) }
      // The main agent is 'main' in every session; its session id varies its character instead.
      const seedOf = (worker: Worker) => (worker.id === ORCHESTRATOR_ID ? sessionId : worker.id)
      const running = list.filter(isRunning)
      const listIds = new Set(list.map(worker => worker.id))
      const archived = past.filter(worker => !listIds.has(worker.id))
      const history = [...list, ...archived.filter(worker => worker.id !== ORCHESTRATOR_ID)].sort(
        (a, b) => b.startedAt - a.startedAt,
      )
      const Svg = e.surface === 'desktop' ? $.ui.resolve(e).Svg : undefined
      const paneWidth = surfaceWidth(e.viewport?.columns, PANE_FALLBACK_PX, PANE_MARGIN_PX)

      // The official figure when the host keeps one; per-agent costs stay estimates.
      const totalCost = sessionTotals.usd ?? list.reduce((sum, worker) => sum + worker.cost, mainAgent.cost)
      const totalTokenCount = list.reduce((sum, worker) => sum + worker.tokens, mainAgent.tokens)
      const starts = [clockNow, ...list.map(worker => worker.startedAt)]
      const firstStart = Math.min(...(mainAgent.startedAt > 0 ? [...starts, mainAgent.startedAt] : starts))
      const sessionStart = sessionTotals.startedAt > 0 ? sessionTotals.startedAt : firstStart
      const clockText = formatDuration(clockNow - sessionStart)

      const stat = (name: string, value: string) => (
        <Box
          key={name}
          flexDirection="column"
          flexGrow={1}
          borderStyle="round"
          borderColor={BORDER_COLOR}
          paddingX={1}
        >
          <Text dimColor>{name}</Text>
          <Text bold>{value}</Text>
        </Box>
      )

      const choose = (next: DashboardTab) => void update($, tab, () => next)
      const tabButton = (id: DashboardTab, label: string, hotkey: string) => (
        <Button
          key={id}
          hotkey={hotkey}
          variant={activeTab === id ? 'primary' : 'secondary'}
          onPress={() => choose(id)}
        >
          {label}
        </Button>
      )

      const activityMark = (worker: Worker, roleColor: string) => {
        const activity = activityOf(worker.status)
        if (activity === 'busy') {
          return <Text color={roleColor}>●</Text>
        }
        if (activity === 'asleep') {
          return <Text dimColor>○</Text>
        }

        return isFailed(worker) ? (
          <Text color={readableColor(STATUS_COLORS.failed ?? NEUTRAL_COLOR)}>✗</Text>
        ) : (
          <Text color={readableColor(SUCCESS_COLOR)}>✓</Text>
        )
      }

      // Sub-agents are shown by default on the Running tab and hidden on History;
      // only what the person flipped is kept, keyed by tab and agent.
      const isRunningTab = activeTab === 'running'
      const isChildrenOpen = (id: string) => openState[childrenKey(activeTab, id)] ?? isOpenByDefault(activeTab)
      // The key and default come from the tab as it stands when pressed, never from the one drawn.
      const toggleChildren = async (id: string) => {
        const pressedTab = await read($, tab)
        const key = childrenKey(pressedTab, id)
        await update($, childrenOpen, state => ({ ...state, [key]: !(state[key] ?? isOpenByDefault(pressedTab)) }))
      }
      const toggleDetail = (id: string) =>
        update($, detailOpen, ids => (ids.includes(id) ? ids.filter(known => known !== id) : [...ids, id]))

      const avatarPxAt = (depth: number) => (depth > 0 ? NESTED_AVATAR_PX : AVATAR_PX)
      // The cell, within a card, the tree line hangs from: the middle of its avatar.
      const trunkOffset = (depth: number) =>
        Svg ? Math.floor(Math.ceil(avatarWidth(avatarPxAt(depth)) / CELL_PX) / 2) : TERMINAL_TRUNK_OFFSET

      // Width left to a card's text column once the nesting and the avatar are taken out.
      const contentWidth = (indentCells: number, avatarPx: number) => {
        const taken = avatarWidth(avatarPx) + CARD_GAP_PX + indentCells * CELL_PX

        return Math.max(MIN_BAR_PX, paneWidth - taken)
      }

      const childrenToggle = (id: string, count: number, toggleKey: string) => (
        <Button key={toggleKey} plain dimColor onPress={() => void toggleChildren(id)}>
          {`${isChildrenOpen(id) ? ARROW_OPEN : ARROW_CLOSED} ${count} sub-agent${count === 1 ? '' : 's'}`}
        </Button>
      )

      // The unbroken tree line: each child row carries its own gutter, spanning the
      // row's whole height (nested children included) except under the last sibling.
      const nestedRows = (
        nodes: TreeNode[],
        offset: number,
        rowGap: number,
        renderNode: (node: TreeNode) => JSX.Element,
      ) => (
        <Box key="nested" flexDirection="column" marginLeft={offset}>
          {nodes.map((node, index) => {
            const isLast = index === nodes.length - 1

            return (
              <Box
                key={node.worker.id}
                flexDirection="column"
                paddingLeft={BRANCH_CELLS}
                paddingBottom={isLast ? 0 : rowGap}
              >
                <Box position="absolute" top={0} bottom={0} left={0} width={BRANCH_GUTTER_CELLS} overflow="hidden">
                  <Text color={BORDER_COLOR}>{branchGutter(isLast)}</Text>
                </Box>
                {renderNode(node)}
              </Box>
            )
          })}
        </Box>
      )

      // The Running tab hides finished workers, so a running worker whose parent
      // ended attaches to its nearest shown ancestor (or the orchestrator).
      const family: Worker[] = isRunningTab ? list : [...list, ...sessionEntries(archived, sessionId)]
      const forest = buildTree(family, isRunningTab ? new Set(running.map(worker => worker.id)) : undefined)
      const pastGroups = isRunningTab ? [] : pastSessionGroups(archived, sessionId)

      type CardOptions = {
        depth: number
        /** Cells of nesting left of the card, for sizing its text column. */
        indent: number
        /** The card's cost with every sub-agent's; shown only when given. */
        treeCost?: number
        childCount: number
        isTrunkShown: boolean
      }
      const card = (worker: Worker, { depth, indent, treeCost, childCount, isTrunkShown }: CardOptions) => {
        const role = roleById(worker.role)
        const roleColor = readableColor(role.color)
        const seed = seedOf(worker)
        const name = agentName(role.id, seed)
        const activity = activityOf(worker.status)
        const isDetailed = detailIds.includes(worker.id)
        const files = worker.files.slice(-HISTORY_FILES).map(baseName).join(', ')
        const avatarPx = avatarPxAt(depth)
        const cardWidth = contentWidth(indent, avatarPx)
        const barColor = isFailed(worker) ? FAILED_BAR_COLOR : roleColor
        const titleChars = Math.min(
          TITLE_CHARS,
          Math.max(MIN_TITLE_CHARS, Math.floor(cardWidth / CELL_PX) - name.length - TITLE_RESERVE_CELLS),
        )
        const trunkCells = trunkOffset(depth) + 1

        return (
          <Box key={worker.id} flexDirection="row" gap={1}>
            {(Svg || isTrunkShown) && (
              <Box key="avatar-column" flexDirection="column" flexShrink={0}>
                {Svg && (
                  <Svg
                    source={avatarSvg(role.id, activity, avatarPx, seed)}
                    alt={`${role.category} ${name}`}
                    width={avatarWidth(avatarPx)}
                    height={avatarPx}
                    isInteractive
                  />
                )}
                {isTrunkShown && (
                  <Box key="trunk" flexGrow={1} width={trunkCells}>
                    <Box position="absolute" top={0} bottom={0} left={trunkCells - 1} width={1} overflow="hidden">
                      <Text color={BORDER_COLOR}>{trunkText()}</Text>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
            <Box flexDirection="column" flexGrow={1}>
              <Box flexDirection="row" justifyContent="space-between" gap={1}>
                <Text bold>
                  <Text color={roleColor}>{name}</Text>
                  <Text> {clip(worker.title, titleChars)}</Text>
                </Text>
                <Box flexDirection="row" gap={1}>
                  {activityMark(worker, roleColor)}
                  <Button key={`detail:${worker.id}`} plain dimColor onPress={() => void toggleDetail(worker.id)}>
                    {isDetailed ? ARROW_OPEN : ARROW_CLOSED}
                  </Button>
                </Box>
              </Box>
              <Text>
                  <Text bold color={roleColor}>
                    {role.category}
                  </Text>
                  <Text dimColor> → </Text>
                  <Text>{modelLabel(worker.model)}</Text>
                  <Text dimColor> → </Text>
                  <Text bold color={readableColor(EFFORT_COLORS[worker.effort] ?? NEUTRAL_COLOR)}>
                    {effortLabel(worker.effort)}
                  </Text>
                  <Text dimColor> → </Text>
                  <Text color={readableColor(STATUS_COLORS[worker.status] ?? NEUTRAL_COLOR)}>
                    {statusLabel(worker.status)}
                  </Text>
                </Text>
              {!isDetailed && (
                <Text dimColor>
                  {money(worker.cost)} · {elapsed(worker, clockNow)}
                </Text>
              )}
              {isDetailed && (
                <Box flexDirection="row" justifyContent="space-between">
                  <Text dimColor>
                    {worker.tools} tools{worker.lastTool ? ` · ${worker.lastTool}` : ''}
                  </Text>
                  <Text dimColor>
                    {formatCount(worker.tokens)} · {money(worker.cost)}
                    {treeCost === undefined ? '' : ` (${money(treeCost)} incl. sub-agents)`} ·{' '}
                    {elapsed(worker, clockNow)}
                  </Text>
                </Box>
              )}
              {Svg && (
                <Box height={BAR_ROW_CELLS} flexShrink={0}>
                  <Svg
                    source={barSvg(barColor, activity, BAR_PX, progressElapsedMs(worker, clockNow))}
                    alt={BAR_ALTS[activity]}
                    width={barWidth(BAR_PX)}
                    height={BAR_ROW_HEIGHT}
                    isInteractive
                  />
                </Box>
              )}
              {isDetailed && files !== '' && <Text dimColor>Files · {clip(files, 90)}</Text>}
              {isDetailed && (
                <Text dimColor>
                  Started {clockTime(worker.startedAt)} · {worker.type} · last call{' '}
                  {money(worker.lastCallCost)}
                </Text>
              )}
              {isDetailed && worker.summary !== '' && <Text>{worker.summary}</Text>}
              {childCount > 0 && childrenToggle(worker.id, childCount, `children:${childrenKey(activeTab, worker.id)}`)}
            </Box>
          </Box>
        )
      }

      // One agent's card, then (when shown) its sub-agents nested under its avatar.
      const agentNode = (
        worker: Worker,
        nodes: TreeNode[],
        depth: number,
        indent: number,
        treeCost?: number,
      ): JSX.Element => {
        const isOpen = nodes.length > 0 && isChildrenOpen(worker.id)
        const offset = trunkOffset(depth)
        const hasBusyBelow = depth === 0 ? list.some(isBusy) : descendants(family, worker.id).some(isBusy)

        return (
          <Box key={worker.id} flexDirection="column">
            {card(withWaiting(worker, hasBusyBelow), {
              depth,
              indent,
              treeCost,
              childCount: nodes.length,
              isTrunkShown: isOpen,
            })}
            {isOpen &&
              nestedRows(nodes, offset, SIBLING_GAP_ROWS, node =>
                agentNode(
                  node.worker,
                  node.children,
                  node.depth,
                  indent + offset + BRANCH_CELLS,
                  hasChildren(family, node.worker.id) ? subtreeCost(family, node.worker.id) : undefined,
                ),
              )}
          </Box>
        )
      }

      // Other sessions are text-only: their avatars would crowd out this session's.
      const remoteRow = (worker: Worker, toggle: JSX.Element | false) => {
        const role = roleById(worker.role)

        return (
          <Box key={worker.id} flexDirection="row" justifyContent="space-between" gap={1}>
            <Text>
              <Text bold color={readableColor(role.color)}>
                {agentName(role.id, worker.id)}
              </Text>
              <Text> {clip(worker.title, REMOTE_TITLE_CHARS)}</Text>
            </Text>
            <Box flexDirection="row" gap={1}>
              <Text dimColor>
                {modelLabel(worker.model)} · {statusLabel(worker.status)} · {money(worker.cost)} ·{' '}
                {elapsed(worker, clockNow)}
              </Text>
              {toggle}
            </Box>
          </Box>
        )
      }
      const remoteNode = (worker: Worker, nodes: TreeNode[], toggleId: string): JSX.Element => {
        const isOpen = nodes.length > 0 && isChildrenOpen(toggleId)
        const toggle =
          nodes.length > 0 && childrenToggle(toggleId, nodes.length, `remote-children:${toggleId}`)

        return (
          <Box key={worker.id} flexDirection="column">
            {remoteRow(worker, toggle)}
            {isOpen &&
              nestedRows(nodes, REMOTE_TRUNK_OFFSET, 0, node =>
                remoteNode(node.worker, node.children, node.worker.id),
              )}
          </Box>
        )
      }
      const remoteSection = (snapshot: SessionSnapshot) => {
        const live = snapshot.workers.filter(isRunning)
        const remoteForest = buildTree(snapshot.workers, new Set(live.map(worker => worker.id)))
        const sessionCost = snapshot.workers.reduce(
          (sum, worker) => sum + worker.cost,
          snapshot.orchestrator.cost,
        )
        const root: Worker = withWaiting(
          { ...snapshot.orchestrator, id: snapshot.sessionId, title: snapshot.label, cost: sessionCost },
          snapshot.workers.some(isBusy),
        )

        return remoteNode(root, remoteForest, `remote:${snapshot.sessionId}`)
      }
      const remoteSessions = isRunningTab
        ? others.filter(snapshot => isBusy(snapshot.orchestrator) || snapshot.workers.some(isRunning))
        : []
      const shown = isRunningTab ? running : history

      return (
        <Box flexDirection="column" gap={1} width="100%">
          <Box flexDirection="row" gap={1}>
            {stat('Cost', money(totalCost))}
            {stat('Tokens', formatCount(totalTokenCount))}
            {stat('Time', clockText)}
          </Box>
          <Box flexDirection="row" gap={1}>
            {tabButton('running', `Running · ${running.length}`, '1')}
            {tabButton('history', `History · ${history.length}`, '2')}
          </Box>
          {remoteSessions.length > 0 && <Text bold>{title ? `This session · ${title}` : 'This session'}</Text>}
          {agentNode({ ...orchestrator, cost: totalCost, tokens: totalTokenCount }, forest, 0, 0)}
          {shown.length === 0 && remoteSessions.length === 0 && (
            <Text dimColor>
              {activeTab === 'running' ? 'No workers running.' : 'No agents invoked yet.'}
            </Text>
          )}
          {pastGroups.map(group => agentNode(pastSessionRoot(group), buildTree(group.workers), 0, 0))}
          {remoteSessions.map(remoteSection)}
        </Box>
      )
    } catch (error) {
      const message = errorText(error)
      $.ui.log(`Agents pane failed to draw: ${message}`, { to: 'debug' })
      const { Text } = $.ui.resolve(e)

      return <Text dimColor>{`Agents pane failed to draw: ${message}`}</Text>
    }
  })
}
