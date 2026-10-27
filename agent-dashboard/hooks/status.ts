import type { Worker, WorkerActivity, WorkerStatus } from '../types'

export const FINISHED: WorkerStatus[] = ['completed', 'failed', 'killed']
const BUSY: WorkerStatus[] = ['running', 'pending']
const FAILED: WorkerStatus[] = ['failed', 'killed']

/** Not finished yet: working, or parked in `waiting` / `idle`. */
export const isRunning = (worker: Worker): boolean => !FINISHED.includes(worker.status)

/** Actively working; a worker parked in `waiting` or `idle` is not. */
export const isBusy = (worker: Worker): boolean => BUSY.includes(worker.status)

export const isFailed = (worker: Worker): boolean => FAILED.includes(worker.status)

export function activityOf(status: WorkerStatus): WorkerActivity {
  if (BUSY.includes(status)) {
    return 'busy'
  }

  return FINISHED.includes(status) ? 'finished' : 'asleep'
}
