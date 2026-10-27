import type { Worker } from '../types'
import { ORCHESTRATOR_ROLE_ID } from './roles'
import { isBusy, isRunning } from './status'

// The orchestrator is the main model loop, tracked as a worker: `running` while
// a main turn is in progress, `idle` (asleep) otherwise.

export const ORCHESTRATOR_ID = 'main'

const FILE_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']
const MAX_FILES = 6

export type TurnSpend = {
  model: string
  tokens: number
  cost: number
}

export function newOrchestrator(startedAt = 0, title = '', cost = 0): Worker {
  return {
    id: ORCHESTRATOR_ID,
    parentId: '',
    title,
    type: 'main',
    role: ORCHESTRATOR_ROLE_ID,
    model: '',
    effort: '',
    status: 'idle',
    tools: 0,
    lastTool: '',
    files: [],
    tokens: 0,
    cost,
    lastCallCost: 0,
    summary: '',
    startedAt,
    endedAt: 0,
  }
}

/** The clock starts at the first sign of life; later stamps never move it. */
export function withStart(main: Worker, stamp: number): Worker {
  return main.startedAt > 0 ? main : { ...main, startedAt: stamp }
}

/** A turn that begins while one runs keeps the earlier turn's stamp. */
export function startMainTurn(main: Worker, stamp: number): Worker {
  const busySince = isBusy(main) && main.busySince ? main.busySince : stamp

  return { ...withStart(main, stamp), status: 'running', busySince }
}

/** A finished turn parks the orchestrator; what the turn cost, when known, is added. */
export function endMainTurn(main: Worker, spend?: TurnSpend, answer = ''): Worker {
  if (!spend) {
    return { ...main, status: 'idle' }
  }

  return {
    ...main,
    status: 'idle',
    model: spend.model || main.model,
    tokens: main.tokens + spend.tokens,
    cost: main.cost + spend.cost,
    lastCallCost: spend.cost,
    summary: answer || main.summary,
  }
}

/** Counts a tool call; file-editing tools also remember the file, newest last. */
export function recordToolCall(worker: Worker, tool: string, path?: string): Worker {
  const isNewFile = path && FILE_TOOLS.includes(tool) && !worker.files.includes(path)

  return {
    ...worker,
    tools: worker.tools + 1,
    lastTool: tool,
    files: isNewFile ? [...worker.files, path].slice(-MAX_FILES) : worker.files,
  }
}

/** The model and, when the step states one, the effort a request ran with. */
export function recordModel(worker: Worker, model: string, effort: string | undefined): Worker {
  return { ...worker, model, effort: effort === undefined ? worker.effort : effort }
}

/**
 * An agent parked while sub-agents below it still work is waiting on them, not
 * idle. Derived at render time, never stored.
 */
export function withWaiting(worker: Worker, hasBusyDescendants: boolean): Worker {
  const isParked = isRunning(worker) && !isBusy(worker)

  return hasBusyDescendants && isParked ? { ...worker, status: 'waiting' } : worker
}
