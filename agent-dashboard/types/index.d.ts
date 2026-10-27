export type WorkerStatus = 'pending' | 'running' | 'waiting' | 'idle' | 'completed' | 'failed' | 'killed'

export type DashboardTab = 'running' | 'history'

/** What a worker is doing right now: working, parked (waiting/idle), or done for good. */
export type WorkerActivity = 'busy' | 'asleep' | 'finished'

export type Worker = {
  id: string
  /** Id of the spawning agent; empty string when spawned by the main loop. */
  parentId: string
  title: string
  type: string
  role: string
  model: string
  effort: string
  status: WorkerStatus
  tools: number
  lastTool: string
  files: string[]
  tokens: number
  cost: number
  lastCallCost: number
  summary: string
  startedAt: number
  endedAt: number
  /** The orchestrator only: the clock stamp its current turn began, which its progress bar counts from. */
  busySince?: number
}

/** A finished worker kept in the history store; entries from before sessions were recorded lack both fields. */
export type ArchivedWorker = Worker & {
  sessionId?: string
  /** The session's heading when the worker was archived. */
  sessionLabel?: string
}

/**
 * What one Claude Code session publishes for the others to read. Version 2
 * carries the orchestrator (the main loop as a worker); version 1 had only
 * `mainCost` and is still readable.
 */
export type SessionSnapshot = {
  version: number
  sessionId: string
  /** The session's title (first prompt) when known, else the basename of its working directory. */
  label: string
  cwd: string
  /** The main model loop, shaped like a worker; its `parentId` is always empty. */
  orchestrator: Worker
  /** Clock stamp of the last publish; 0 marks a session that ended. */
  heartbeat: number
  workers: Worker[]
}

declare module 'claude-code' {
  interface PluginState {
    'agent-dashboard': {
      /** What the pane draws: `liveWorkers` with its counters published on a coarse clock. */
      workers: Worker[]
      /** The orchestrator as the pane draws it: `running` while a main turn is in progress, `idle` otherwise. */
      main: Worker
      /** The up-to-date workers, counters included. Never read while drawing, so writing it redraws nothing. */
      liveWorkers: Worker[]
      /** The up-to-date orchestrator; the counterpart of `liveWorkers`. */
      liveMain: Worker
      /** Working directory and id of this session, read once so a draw makes no round trip for them. */
      sessionCwd: string
      sessionId: string
      sessionTitle: string
      /** The pane's coarse clock: written every few seconds while something runs, not every second. */
      now: number
      lastRunningAt: number
      tab: DashboardTab
      archive: ArchivedWorker[]
      /** Overrides of whether an agent's sub-agents are shown, keyed `${tab}:${agentId}`; absent keys follow the tab's default. */
      childrenOpen: Record<string, boolean>
      /** Ids of the agents whose card is expanded to full detail; every other card is compact. */
      detailOpen: string[]
      otherSessions: SessionSnapshot[]
    }
  }
}
