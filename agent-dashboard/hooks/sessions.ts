import type { ArchivedWorker, SessionSnapshot, Worker, WorkerStatus } from '../types'

import { ORCHESTRATOR_ID, newOrchestrator } from './orchestrator'
import { ORCHESTRATOR_ROLE_ID } from './roles'
import { isRunning } from './status'
import { clip } from './text'

export const SNAPSHOT_VERSION = 2
/** Version 1 carried only `mainCost`; it still parses, with an idle orchestrator synthesized from it. */
const LEGACY_SNAPSHOT_VERSION = 1
export const SYNC_MS = 2000
/** A live session rewrites its file at least this often, even when nothing changed. */
export const HEARTBEAT_MS = SYNC_MS * 2
/** A snapshot whose heartbeat is older than this belongs to a session that is gone. */
export const STALE_MS = SYNC_MS * 4
export const MAX_REMOTE_SESSIONS = 20
export const SESSIONS_SUBDIR = 'agent-dashboard/sessions'

const FILE_SUFFIX = '.json'
const PATH_SEPARATORS = /[\\/]/
const UNSAFE_FILE_CHARS = /[^A-Za-z0-9_-]/g
const WORKER_STATUSES: WorkerStatus[] = [
  'pending',
  'running',
  'waiting',
  'idle',
  'completed',
  'failed',
  'killed',
]

type Raw = Record<string, unknown>

const isRecord = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback)

const count = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0

function parseWorker(value: unknown): Worker | null {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id === '') {
    return null
  }
  const status = WORKER_STATUSES.find(known => known === value.status)
  if (!status) {
    return null
  }

  return {
    id: value.id,
    parentId: text(value.parentId),
    title: text(value.title, value.id),
    type: text(value.type, 'agent'),
    role: text(value.role, 'builder'),
    model: text(value.model),
    effort: text(value.effort),
    status,
    tools: count(value.tools),
    lastTool: text(value.lastTool),
    files: Array.isArray(value.files) ? value.files.filter(file => typeof file === 'string') : [],
    tokens: count(value.tokens),
    cost: count(value.cost),
    lastCallCost: count(value.lastCallCost),
    summary: text(value.summary),
    startedAt: count(value.startedAt),
    endedAt: count(value.endedAt),
  }
}

/** The orchestrator as published; one missing or malformed is synthesized from the legacy `mainCost`. */
function parseOrchestrator(value: Raw, label: string): Worker {
  const parsed = parseWorker(value.orchestrator)
  if (!parsed) {
    return newOrchestrator(0, label, count(value.mainCost))
  }

  return { ...parsed, id: ORCHESTRATOR_ID, parentId: '', role: ORCHESTRATOR_ROLE_ID }
}

/** Validates data read from a session file; anything malformed or of an unknown version is null. */
export function parseSessionSnapshot(value: unknown): SessionSnapshot | null {
  if (!isRecord(value) || (value.version !== SNAPSHOT_VERSION && value.version !== LEGACY_SNAPSHOT_VERSION)) {
    return null
  }
  if (typeof value.sessionId !== 'string' || value.sessionId === '' || !Array.isArray(value.workers)) {
    return null
  }
  const cwd = text(value.cwd)
  const label = text(value.label, labelFromCwd(cwd))

  return {
    version: SNAPSHOT_VERSION,
    sessionId: value.sessionId,
    label,
    cwd,
    orchestrator: parseOrchestrator(value, label),
    heartbeat: count(value.heartbeat),
    workers: value.workers.map(parseWorker).filter((worker): worker is Worker => worker !== null),
  }
}

/** Parses file text; invalid JSON is null rather than an error. */
export function parseSnapshotText(raw: string): SessionSnapshot | null {
  try {
    return parseSessionSnapshot(JSON.parse(raw))
  } catch {
    return null
  }
}

/** Last path segment of a directory, whichever separator it uses. */
export function labelFromCwd(cwd: string): string {
  const parts = cwd.split(PATH_SEPARATORS).filter(part => part !== '')

  return parts[parts.length - 1] ?? (cwd || '—')
}

/** File name for a session id, safe on every file system. */
export function sessionFileName(sessionId: string): string {
  return `${sessionId.replace(UNSAFE_FILE_CHARS, '_')}${FILE_SUFFIX}`
}

export function isSessionFile(name: string): boolean {
  return name.endsWith(FILE_SUFFIX)
}

/** Cheap pre-filter on a directory entry, so files of long-gone sessions are never read. */
export function isFileRecent(mtimeMs: number, clockNow: number): boolean {
  return clockNow - mtimeMs <= STALE_MS
}

export function isFresh(snapshot: SessionSnapshot, clockNow: number): boolean {
  return snapshot.heartbeat > 0 && clockNow - snapshot.heartbeat <= STALE_MS
}

/** Live snapshots of other sessions in a stable order, capped at MAX_REMOTE_SESSIONS. */
export function liveSnapshots(
  snapshots: SessionSnapshot[],
  ownId: string,
  clockNow: number,
): SessionSnapshot[] {
  return snapshots
    .filter(snapshot => snapshot.sessionId !== ownId && isFresh(snapshot, clockNow))
    .sort((a, b) => a.label.localeCompare(b.label) || a.sessionId.localeCompare(b.sessionId))
    .slice(0, MAX_REMOTE_SESSIONS)
}

/**
 * What a closing session leaves behind: its own data, kept for a later resume,
 * with a zero heartbeat that reads as gone at once.
 */
export function endedSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  return { ...snapshot, heartbeat: 0 }
}

/** The session's title as published, or '' when the label is only its directory's name. */
export function restoredTitle(snapshot: SessionSnapshot): string {
  return snapshot.label === labelFromCwd(snapshot.cwd) ? '' : snapshot.label
}

/** The orchestrator of a resumed session: its totals are kept, but no turn is running. */
export function restoredOrchestrator(snapshot: SessionSnapshot): Worker {
  return { ...snapshot.orchestrator, status: 'idle' }
}

/**
 * When a restored worker was last known alive, by id, for every one that was
 * not finished: its own end, else the snapshot's heartbeat, else its start.
 */
export function restoredUnfinished(snapshot: SessionSnapshot): Map<string, number> {
  return new Map(
    snapshot.workers
      .filter(isRunning)
      .map(worker => [worker.id, Math.max(worker.endedAt, snapshot.heartbeat, worker.startedAt)]),
  )
}

/**
 * A restored worker that is no longer in the live agent list cannot still be
 * running: it is closed as `completed` at its last known time. Its real outcome
 * is not known, and `completed` keeps it out of the failure marks.
 */
export function finishVanished(
  workers: Worker[],
  lastKnownAt: ReadonlyMap<string, number>,
  liveIds: ReadonlySet<string>,
): Worker[] {
  return workers.map(worker => {
    const endedAt = lastKnownAt.get(worker.id)
    if (endedAt === undefined || liveIds.has(worker.id) || !isRunning(worker)) {
      return worker
    }

    return { ...worker, status: 'completed', endedAt }
  })
}

/** Everything but the heartbeat, which changes on every publish. */
export function snapshotContentKey(snapshot: SessionSnapshot): string {
  return JSON.stringify({ ...snapshot, heartbeat: 0 })
}

export function sameSnapshots(a: SessionSnapshot[], b: SessionSnapshot[]): boolean {
  return a.length === b.length && a.every((snapshot, index) => {
    const other = b[index]

    return other !== undefined && snapshotContentKey(snapshot) === snapshotContentKey(other)
  })
}

/** Publish when the content changed or the last heartbeat is due for renewal. */
export function shouldPublish(
  lastKey: string | undefined,
  key: string,
  lastHeartbeat: number,
  clockNow: number,
): boolean {
  return lastKey !== key || clockNow - lastHeartbeat >= HEARTBEAT_MS
}

export const SESSION_TITLE_CHARS = 40
const NON_PROMPT_PREFIXES = ['/', '<']

/** One line of a prompt, clipped to fit a heading. */
export function promptTitle(prompt: string): string {
  return clip(prompt.replace(/\s+/g, ' ').trim(), SESSION_TITLE_CHARS)
}

/**
 * The session's title as far as a mod can know it: Claude Code exposes no
 * readable session title, so the first real prompt of the transcript stands in.
 * Slash commands and injected markup (`<system-reminder>`, notifications) are skipped.
 */
export function firstPromptTitle(messages: ReadonlyArray<{ role: string; text: string }>): string {
  const first = messages.find(message => {
    const body = message.text.trim()

    return (
      message.role === 'user' &&
      body !== '' &&
      !NON_PROMPT_PREFIXES.some(prefix => body.startsWith(prefix))
    )
  })

  return first ? promptTitle(first.text) : ''
}

/** What a session section is headed with: its title when known, else its directory's name. */
export function sessionLabel(title: string, cwd: string): string {
  return title || labelFromCwd(cwd)
}

export const EARLIER_SESSIONS_LABEL = 'Earlier sessions'
const SESSION_ROOT_PREFIX = 'session:'
const LEGACY_SESSION_KEY = 'earlier'
const SESSION_ID_CHARS = 8

/** A worker as stored in the history: tagged with the session it ran in, when that is known. */
export function archiveEntry(worker: Worker, sessionId: string, label: string): ArchivedWorker {
  return sessionId === '' ? worker : { ...worker, sessionId, sessionLabel: label }
}

/** Archived workers that ran in the given session. */
export function sessionEntries(entries: ArchivedWorker[], sessionId: string): ArchivedWorker[] {
  return sessionId === '' ? [] : entries.filter(entry => entry.sessionId === sessionId)
}

export type SessionGroup = {
  /** The session id; empty for entries archived before sessions were recorded. */
  key: string
  label: string
  workers: ArchivedWorker[]
}

const startOf = (group: SessionGroup): number => {
  const starts = group.workers.map(worker => worker.startedAt).filter(stamp => stamp > 0)

  return starts.length > 0 ? Math.min(...starts) : 0
}

/**
 * Archived workers of every session but `currentSessionId`, one group per
 * session, newest first; entries without a session end up in one last group.
 */
export function pastSessionGroups(entries: ArchivedWorker[], currentSessionId: string): SessionGroup[] {
  const groups = new Map<string, SessionGroup>()
  for (const entry of entries) {
    const key = entry.sessionId ?? ''
    if (key !== '' && key === currentSessionId) {
      continue
    }
    const label = key === '' ? EARLIER_SESSIONS_LABEL : entry.sessionLabel || key.slice(0, SESSION_ID_CHARS)
    const group = groups.get(key) ?? { key, label, workers: [] }
    group.workers.push(entry)
    groups.set(key, group)
  }

  return [...groups.values()].sort((a, b) => {
    if (a.key === '' || b.key === '') {
      return a.key === '' ? 1 : -1
    }

    return startOf(b) - startOf(a)
  })
}

export function sessionRootId(group: SessionGroup): string {
  return `${SESSION_ROOT_PREFIX}${group.key || LEGACY_SESSION_KEY}`
}

/** A lightweight orchestrator for a past session: its workers' totals under the session's label. */
export function pastSessionRoot(group: SessionGroup): Worker {
  const sum = (pick: (worker: Worker) => number) =>
    group.workers.reduce((total, worker) => total + pick(worker), 0)

  return {
    ...newOrchestrator(startOf(group), group.label, sum(worker => worker.cost)),
    id: sessionRootId(group),
    status: 'completed',
    tokens: sum(worker => worker.tokens),
    endedAt: Math.max(0, ...group.workers.map(worker => worker.endedAt)),
  }
}
