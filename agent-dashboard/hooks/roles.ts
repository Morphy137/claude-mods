// One kind of worker: its color, the words that pick it, and the names its agents
// go by. How its agents look lives in avatar-data.ts (ten characters per role).

export type Role = {
  id: string
  category: string
  /** Everyday names; each agent gets one, picked by its id. */
  names: string[]
  color: string
  keywords: RegExp | null
}

export const ORCHESTRATOR_ROLE_ID = 'orchestrator'

export const ROLES: Role[] = [
  {
    // The main model loop. It is never assigned to a sub-agent: no keywords, and
    // `classify` draws only from ASSIGNABLE_ROLES.
    id: ORCHESTRATOR_ROLE_ID,
    category: 'Orchestrator',
    names: ['Alex', 'Morgan', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Avery', 'Quinn', 'Harper', 'Rowan'],
    color: '#2563eb',
    keywords: null,
  },
  {
    id: 'architect',
    category: 'Architect',
    names: ['Ethan', 'Olivia', 'Daniel', 'Sophia', 'Lucas', 'Emma', 'Henry', 'Grace', 'Oliver', 'Chloe'],
    color: '#8b5cf6',
    keywords: /\b(plan|architect|strateg|roadmap|outline|blueprint)/,
  },
  {
    id: 'inspector',
    category: 'Inspector',
    names: ['Iris', 'Victor', 'Nora', 'Simon', 'Clara', 'Felix', 'Elena', 'Hugo', 'Vera', 'Oscar'],
    color: '#14b8a6',
    keywords: /\b(review|audit|critique|lint|inspect|check)/,
  },
  {
    id: 'guard',
    category: 'Guardian',
    names: ['Marcus', 'Diana', 'Rex', 'Helena', 'Bruno', 'Kate', 'Logan', 'Sara', 'Owen', 'Tessa'],
    color: '#ef4444',
    keywords: /\b(secur|vulnerab|threat|auth|permission|safety|harden)/,
  },
  {
    id: 'chemist',
    category: 'Tester',
    names: ['Theo', 'Mia', 'Leo', 'Ada', 'Max', 'Zoe', 'Sam', 'Ivy', 'Ben', 'Lily'],
    color: '#22c55e',
    keywords: /\b(tests?|testing|qa|verify|validate|benchmark|experiment|assert)/,
  },
  {
    id: 'detective',
    category: 'Debugger',
    names: ['Arthur', 'Ruby', 'Frank', 'Alice', 'Walter', 'Jane', 'George', 'Rose', 'Edward', 'Hazel'],
    color: '#a8794a',
    keywords: /\b(debug|bug|diagnos|investigat|root cause|trace|fix|crash)/,
  },
  {
    id: 'scholar',
    category: 'Researcher',
    names: ['Isaac', 'Marie', 'Albert', 'Rosalind', 'Charles', 'Emily', 'Thomas', 'Lucy', 'Nathan', 'Julia'],
    color: '#6366f1',
    keywords: /\b(research|competitor|study|analy[sz]|literature|compare|learn|investigate)/,
  },
  {
    id: 'scribe',
    category: 'Writer',
    names: ['William', 'Charlotte', 'James', 'Anne', 'Jack', 'Louisa', 'Paul', 'Mary', 'Robert', 'Agnes'],
    color: '#e11d48',
    keywords: /\b(document|docs?|write|writing|readme|copy|summar|draft|blog|changelog|translate)/,
  },
  {
    id: 'designer',
    category: 'Designer',
    names: ['Leon', 'Stella', 'Milo', 'Luna', 'Adrian', 'Bella', 'Dylan', 'Nina', 'Ezra', 'Maya'],
    color: '#ec4899',
    keywords: /\b(design|ui|ux|graphic|logo|style|css|layout|visual|mock|brand|icon)/,
  },
  {
    id: 'pilot',
    category: 'Release',
    names: ['Amelia', 'Neil', 'Sally', 'Yuri', 'Valerie', 'Scott', 'Gina', 'Mark', 'Kara', 'Tom'],
    color: '#1f9d6a',
    keywords: /\b(deploy|release|ship|launch|publish|ci|pipeline|rollout)/,
  },
  {
    id: 'miner',
    category: 'Indexer',
    names: ['Gus', 'Ruth', 'Carl', 'Edith', 'Hank', 'Martha', 'Earl', 'Doris', 'Roy', 'Irene'],
    color: '#c4572b',
    keywords: /\b(index|grep|crawl|dig|mine|scrape|extract|data|database|query)/,
  },
  {
    id: 'chef',
    category: 'Processor',
    names: ['Marco', 'Rita', 'Gino', 'Paula', 'Luis', 'Carmen', 'Remy', 'Elsa', 'Tony', 'Nadia'],
    color: '#fb923c',
    keywords: /\b(cook|process|transform|format|convert|generate|prepare|compile)/,
  },
  {
    id: 'scout',
    category: 'Explorer',
    names: ['Finn', 'Skye', 'Jake', 'Willow', 'Kai', 'Juniper', 'Cody', 'River', 'Rory', 'Sienna'],
    color: '#0ea5e9',
    keywords: /\b(explore|survey|scout|locate|discover|find|search)/,
  },
  {
    id: 'builder',
    category: 'Builder',
    names: ['Bob', 'Wendy', 'Mike', 'Jill', 'Pete', 'Rosie', 'Dave', 'Holly', 'Steve', 'Penny'],
    color: '#f5b800',
    keywords: /\b(build|implement|create|refactor|code|develop|add|make|landing|page|app)/,
  },
  {
    id: 'wizard',
    category: 'Specialist',
    names: ['Elias', 'Freya', 'Silas', 'Aurora', 'Damon', 'Selene', 'Caspian', 'Willa', 'Gideon', 'Mira'],
    color: '#a855f7',
    keywords: null,
  },
]

const TYPE_ROLES: Record<string, string> = {
  explore: 'scout',
  plan: 'architect',
  'general-purpose': 'builder',
}
const FALLBACK = ROLES[ROLES.length - 1] as Role
const ASSIGNABLE_ROLES = ROLES.filter(role => role.id !== ORCHESTRATOR_ROLE_ID)

export function roleById(id: string): Role {
  return ROLES.find(role => role.id === id) ?? FALLBACK
}

/** The role for a worker: its task's words first, then its agent type, then a stable pick. */
export function classify(title: string, type: string): Role {
  const text = `${title} ${type}`.toLowerCase()
  const typed = TYPE_ROLES[type.toLowerCase()]
  const byTypeOnly = typed === 'scout' || typed === 'architect' ? typed : null
  if (byTypeOnly) {
    return roleById(byTypeOnly)
  }
  const matched = ROLES.find(role => role.keywords !== null && role.keywords.test(text))
  if (matched) {
    return matched
  }
  if (typed) {
    return roleById(typed)
  }
  const sum = Array.from(type).reduce((total, char) => total + char.charCodeAt(0), 0)

  return ASSIGNABLE_ROLES[sum % ASSIGNABLE_ROLES.length] ?? FALLBACK
}

// FNV-1a: a cheap, stable string hash, so an agent keeps its character and name on every redraw.
const FNV_OFFSET = 2166136261
const FNV_PRIME = 16777619

/** A stable index in [0, length) for the seed; 0 for an empty pool. */
export function pickBySeed(seed: string, length: number): number {
  if (length <= 0) {
    return 0
  }
  let hash = FNV_OFFSET
  for (let index = 0; index < seed.length; index++) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), FNV_PRIME) >>> 0
  }

  return hash % length
}

/** The agent's name from its role's pool, picked by its id (a different draw than its character). */
export function agentName(roleId: string, seed: string): string {
  const { names } = roleById(roleId)

  return names[pickBySeed(`name:${seed}`, names.length)] ?? roleById(roleId).category
}
