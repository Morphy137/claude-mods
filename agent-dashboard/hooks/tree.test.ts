import { expect, test } from 'claude-code/testing'

import type { Worker } from '../types'
import type { TreeNode } from './tree'
import {
  GUIDE_ROWS,
  MAX_TREE_DEPTH,
  branchGutter,
  buildTree,
  descendants,
  hasChildren,
  subtreeCost,
  trunkText,
} from './tree'

const worker = (id: string, parentId: string | undefined, startedAt: number, cost = 1): Worker =>
  ({
    id,
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
    cost,
    lastCallCost: 0,
    summary: '',
    startedAt,
    endedAt: 0,
    ...(parentId === undefined ? {} : { parentId }),
  }) as Worker

const ids = (rows: { worker: Worker }[]) => rows.map(row => row.worker.id)

const flatten = (nodes: TreeNode[]): TreeNode[] => nodes.flatMap(node => [node, ...flatten(node.children)])

test('branchGutter draws the branch and, unless last, the trunk beneath it', () => {
  expect(branchGutter(true)).toBe('└─')
  const middle = branchGutter(false).split('\n')
  expect(middle[0]).toBe('├─')
  expect(middle).toHaveLength(GUIDE_ROWS)
  expect(middle.slice(1).every(line => line === '│')).toBe(true)
  expect(trunkText(3)).toBe('│\n│\n│')
})

test('buildTree nests children newest first at every level', () => {
  const roots = buildTree([
    worker('a', '', 1),
    worker('b', 'a', 2),
    worker('c', 'a', 3),
    worker('d', '', 4),
  ])
  expect(ids(roots)).toEqual(['d', 'a'])
  expect(ids(roots[1]?.children ?? [])).toEqual(['c', 'b'])
  expect(flatten(roots).map(node => node.depth)).toEqual([1, 1, 2, 2])
})

test('buildTree attaches unknown parents and missing parentId to the root', () => {
  const rows = buildTree([worker('a', 'ghost', 1), worker('b', undefined, 2)])
  expect(rows.map(row => row.depth)).toEqual([1, 1])
  expect(ids(rows)).toEqual(['b', 'a'])
})

test('buildTree attaches to the nearest shown ancestor', () => {
  const all = [worker('a', '', 1), worker('b', 'a', 2), worker('c', 'b', 3)]
  const rows = buildTree(all, new Set(['a', 'c']))
  expect(ids(rows)).toEqual(['a'])
  expect(ids(rows[0]?.children ?? [])).toEqual(['c'])
  expect(rows[0]?.children[0]?.depth).toBe(2)
})

test('buildTree survives cycles', () => {
  const rows = flatten(buildTree([worker('a', 'b', 1), worker('b', 'a', 2), worker('s', 's', 3)]))
  expect(ids(rows).sort()).toEqual(['a', 'b', 's'])
})

test('buildTree caps depth', () => {
  const chain = Array.from({ length: MAX_TREE_DEPTH + 3 }, (_, i) =>
    worker(`w${i}`, i === 0 ? '' : `w${i - 1}`, i),
  )
  const rows = flatten(buildTree(chain))
  expect(rows).toHaveLength(chain.length)
  expect(Math.max(...rows.map(row => row.depth))).toBe(MAX_TREE_DEPTH)
})

test('subtreeCost sums descendants and tolerates cycles', () => {
  const list = [worker('a', '', 1, 1), worker('b', 'a', 2, 2), worker('c', 'b', 3, 4), worker('x', '', 4, 8)]
  expect(subtreeCost(list, 'a')).toBe(7)
  expect(subtreeCost([worker('p', 'q', 1, 1), worker('q', 'p', 2, 1)], 'p')).toBe(2)
  expect(hasChildren(list, 'a')).toBe(true)
  expect(hasChildren(list, 'c')).toBe(false)
})

test('descendants lists everything below a worker and tolerates cycles', () => {
  const list = [worker('a', '', 1), worker('b', 'a', 2), worker('c', 'b', 3), worker('x', '', 4)]
  expect(ids(descendants(list, 'a').map(found => ({ worker: found }))).sort()).toEqual(['b', 'c'])
  expect(descendants(list, 'c')).toEqual([])
  expect(descendants([worker('p', 'q', 1), worker('q', 'p', 2)], 'p')).toHaveLength(1)
})
