import { expect, test } from 'claude-code/testing'

import { ORCHESTRATOR_ROLE_ID, ROLES, agentName, classify, pickBySeed, roleById } from './roles'

const AGENT_TYPES = ['general-purpose', 'Explore', 'Plan', 'custom-agent', 'x', 'orchestrator', '']
const TITLES = ['', 'orchestrator Claude conductor', 'review the diff', 'something unrelated', 'main']

test('the orchestrator has its own role, and every role a pool of ten names', () => {
  const role = roleById(ORCHESTRATOR_ROLE_ID)

  expect(role.id).toBe(ORCHESTRATOR_ROLE_ID)
  expect(role.category).toBe('Orchestrator')
  expect(role.keywords).toBeNull()
  const all = ROLES.flatMap(each => each.names)
  for (const each of ROLES) {
    expect(each.names).toHaveLength(10)
  }
  expect(new Set(all).size).toBe(all.length)
})

test('an agent keeps its name, and different agents spread over the pool', () => {
  expect(agentName('builder', 'a1')).toBe(agentName('builder', 'a1'))
  expect(roleById('builder').names).toContain(agentName('builder', 'a1'))
  const picked = new Set(Array.from({ length: 200 }, (_, index) => agentName('builder', `agent-${index}`)))
  expect(picked.size).toBe(10)
  expect(pickBySeed('x', 0)).toBe(0)
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

