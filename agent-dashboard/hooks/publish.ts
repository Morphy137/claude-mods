import type { SessionSnapshot, Worker } from '../types'

// Counters change on every tool call and turn; they are published to the pane
// on a coarse clock, while anything else a card shows is published at once.
const ZERO_COUNTERS = { tools: 0, lastTool: '', files: [] as string[], tokens: 0, cost: 0, lastCallCost: 0 }

function structureKey(worker: Worker): string {
  return JSON.stringify({ ...worker, ...ZERO_COUNTERS })
}

/** True when two orchestrators differ at most in their counters. */
export function sameWorkerStructure(a: Worker, b: Worker): boolean {
  return structureKey(a) === structureKey(b)
}

/** True when two worker lists have the same workers in the same state, whatever their counters. */
export function sameWorkersStructure(a: Worker[], b: Worker[]): boolean {
  return a.length === b.length && a.every((worker, index) => structureKey(worker) === structureKey(b[index] as Worker))
}

function snapshotStructureKey(snapshot: SessionSnapshot): string {
  return JSON.stringify({
    ...snapshot,
    heartbeat: 0,
    orchestrator: { ...snapshot.orchestrator, ...ZERO_COUNTERS },
    workers: snapshot.workers.map(worker => ({ ...worker, ...ZERO_COUNTERS })),
  })
}

/** True when two snapshot lists differ at most in heartbeats and worker counters. */
export function sameSnapshotsStructure(a: SessionSnapshot[], b: SessionSnapshot[]): boolean {
  return a.length === b.length && a.every((snapshot, index) => snapshotStructureKey(snapshot) === snapshotStructureKey(b[index] as SessionSnapshot))
}
