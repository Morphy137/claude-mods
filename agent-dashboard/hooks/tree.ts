import type { Worker } from '../types'

export const MAX_TREE_DEPTH = 6

const BRANCH_MID = '├─'
const BRANCH_LAST = '└─'
const TRUNK = '│'
/** Rows of guide a trunk text carries; an overflow-hidden Box cuts it to the height it spans. */
export const GUIDE_ROWS = 80

export type TreeNode = {
  worker: Worker
  /** 1 for a child of the orchestrator (the root card, drawn apart from these nodes). */
  depth: number
  /** Sub-agents of this one, newest first. */
  children: TreeNode[]
}

const parentOf = (worker: Worker): string => worker.parentId ?? ''

const newestFirst = (a: Worker, b: Worker): number => b.startedAt - a.startedAt

/** A vertical guide: one `│` per row, for a Box clipped to the height it spans. */
export function trunkText(rows = GUIDE_ROWS): string {
  return Array.from({ length: rows }, () => TRUNK).join('\n')
}

/**
 * The gutter drawn left of a child: its branch on the first row and, unless it
 * is the last sibling, the trunk below it so the line runs on to the next one.
 */
export function branchGutter(isLast: boolean, rows = GUIDE_ROWS): string {
  if (isLast) {
    return BRANCH_LAST
  }

  return [BRANCH_MID, ...Array.from({ length: rows - 1 }, () => TRUNK)].join('\n')
}

/**
 * Nests `workers` under the orchestrator, newest first at every level. Only ids
 * in `shownIds` (default all) get a node; a child whose parent is hidden or
 * unknown attaches to its nearest shown ancestor, else to the orchestrator.
 * Cycles are broken with a visited set; past MAX_TREE_DEPTH, descendants are
 * flattened in as siblings so depth never exceeds the cap.
 */
export function buildTree(workers: Worker[], shownIds?: Set<string>): TreeNode[] {
  const byId = new Map(workers.map(worker => [worker.id, worker]))
  const isShown = (id: string) => byId.has(id) && (!shownIds || shownIds.has(id))

  const attachment = (worker: Worker): string => {
    const seen = new Set([worker.id])
    let parent = parentOf(worker)
    while (parent !== '' && !seen.has(parent)) {
      if (isShown(parent)) {
        return parent
      }
      seen.add(parent)
      const next = byId.get(parent)
      parent = next ? parentOf(next) : ''
    }

    return ''
  }

  const children = new Map<string, Worker[]>()
  const shown = workers.filter(worker => isShown(worker.id))
  for (const worker of shown) {
    const key = attachment(worker)
    children.set(key, [...(children.get(key) ?? []), worker])
  }
  children.forEach(list => list.sort(newestFirst))

  const visited = new Set<string>()
  const walk = (parentKey: string, depth: number): TreeNode[] =>
    (children.get(parentKey) ?? [])
      .filter(worker => !visited.has(worker.id))
      .flatMap(worker => {
        if (visited.has(worker.id)) {
          return []
        }
        visited.add(worker.id)
        const isCapped = depth >= MAX_TREE_DEPTH

        return isCapped
          ? [{ worker, depth, children: [] }, ...walk(worker.id, depth)]
          : [{ worker, depth, children: walk(worker.id, depth + 1) }]
      })

  const roots = walk('', 1)

  // Workers caught in a parent cycle are unreachable from the root: attach them to it.
  shown
    .filter(worker => !visited.has(worker.id))
    .sort(newestFirst)
    .forEach(worker => {
      if (visited.has(worker.id)) {
        return
      }
      visited.add(worker.id)
      roots.push({ worker, depth: 1, children: walk(worker.id, 2) })
    })

  return roots
}

/** Every worker below `rootId` in `workers` (not the root itself); cycle-safe. */
export function descendants(workers: Worker[], rootId: string): Worker[] {
  const children = new Map<string, Worker[]>()
  workers.forEach(worker => {
    const key = parentOf(worker)
    children.set(key, [...(children.get(key) ?? []), worker])
  })
  const visited = new Set<string>([rootId])
  const stack = [rootId]
  const found: Worker[] = []
  while (stack.length > 0) {
    const id = stack.pop() as string
    for (const child of children.get(id) ?? []) {
      if (!visited.has(child.id)) {
        visited.add(child.id)
        found.push(child)
        stack.push(child.id)
      }
    }
  }

  return found
}

/** Cost of a worker plus every descendant in `workers`; cycle-safe. */
export function subtreeCost(workers: Worker[], rootId: string): number {
  const own = workers.find(worker => worker.id === rootId)

  return descendants(workers, rootId).reduce((sum, worker) => sum + worker.cost, own?.cost ?? 0)
}

export function hasChildren(workers: Worker[], id: string): boolean {
  return workers.some(worker => parentOf(worker) === id && worker.id !== id)
}
