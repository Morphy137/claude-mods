import { expect, test } from 'claude-code/testing'

import { ORCHESTRATOR_ROLE_ID, ROLES, classify, roleById } from './roles'

const AGENT_TYPES = ['general-purpose', 'Explore', 'Plan', 'custom-agent', 'x', 'orchestrator', '']
const TITLES = ['', 'orchestrator Claude conductor', 'review the diff', 'something unrelated', 'main']
const HAT_ROWS = 6

test('the orchestrator has its own role with a hat and a busy overlay', () => {
  const role = roleById(ORCHESTRATOR_ROLE_ID)

  expect(role.id).toBe(ORCHESTRATOR_ROLE_ID)
  expect(role.category).toBe('Orchestrator')
  expect(role.name).toBe('Claude')
  expect(role.keywords).toBeNull()
  expect(role.hat).not.toBe('')
  expect(role.overlay).toContain('animateTransform')
})

test('classify never hands the orchestrator role to a sub-agent', () => {
  for (const type of AGENT_TYPES) {
    for (const title of TITLES) {
      expect(classify(title, type).id).not.toBe(ORCHESTRATOR_ROLE_ID)
    }
  }
  for (let code = 0; code < 200; code += 1) {
    expect(classify('', `type-${code}`).id).not.toBe(ORCHESTRATOR_ROLE_ID)
  }
})

test('every hat stays within the top rows of the grid', () => {
  for (const role of ROLES) {
    const rows = [...role.hat.matchAll(/y="([\d.]+)" width="[\d.]+" height="([\d.]+)"/g)]
    for (const [, y = '0', height = '0'] of rows) {
      expect(Number(y) + Number(height)).toBeLessThanOrEqual(HAT_ROWS)
    }
  }
})
