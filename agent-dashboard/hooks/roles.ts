// One design per kind of worker. A role is a hat drawn above the mascot's body
// (rows 0-5 of the 12x14 grid), an optional motion of that hat, and an overlay
// of animated pieces drawn only while the worker is busy.

export type Role = {
  id: string
  category: string
  name: string
  color: string
  keywords: RegExp | null
  hat: string
  hatMotion: string
  overlay: string
}

const SCAN = `<animateTransform attributeName="transform" type="translate" values="-0.4 0;0.4 0;-0.4 0" dur="1.2s" repeatCount="indefinite"/>`
const NOD = `<animateTransform attributeName="transform" type="translate" values="0 0;0 0.4;0 0" dur="0.6s" repeatCount="indefinite"/>`
const NONE = ''

const blink = (begin: number, dur = 1) =>
  `<animate attributeName="opacity" values="0;1;0" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>`

const rise = (x: number, begin: number, fill: string) =>
  `<rect x="${x}" y="5" width="1" height="1" fill="${fill}"><animate attributeName="y" values="5;0" dur="1.2s" begin="${begin}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1.2s" begin="${begin}s" repeatCount="indefinite"/></rect>`

const line = (y: number, begin: number, fill: string) =>
  `<rect x="0" y="${y}" width="3" height="1" fill="${fill}"><animate attributeName="width" values="0;3;3" dur="1.4s" begin="${begin}s" repeatCount="indefinite"/></rect>`

export const ORCHESTRATOR_ROLE_ID = 'orchestrator'

export const ROLES: Role[] = [
  {
    // The main model loop. It is never assigned to a sub-agent: no keywords, and
    // `classify` draws only from ASSIGNABLE_ROLES.
    id: ORCHESTRATOR_ROLE_ID,
    category: 'Orchestrator',
    name: 'Claude',
    color: '#2563eb',
    keywords: null,
    hat: `<rect x="5" y="2" width="2" height="2" fill="#facc15"/><rect x="3" y="3" width="1" height="1" fill="#facc15"/><rect x="8" y="3" width="1" height="1" fill="#facc15"/><rect x="3" y="4" width="6" height="1" fill="#facc15"/><rect x="5" y="4" width="2" height="1" fill="#ef4444"/><rect x="2" y="5" width="8" height="1" fill="#ca8a04"/>`,
    hatMotion: NONE,
    overlay: `<g><rect x="10" y="2" width="1" height="4" fill="#92400e"/><rect x="10" y="1" width="1" height="1" fill="#facc15"/><animateTransform attributeName="transform" type="rotate" values="-35 10.5 6;20 10.5 6;-35 10.5 6" dur="0.7s" repeatCount="indefinite"/></g><rect x="1" y="3" width="1" height="1" fill="#2563eb">${blink(0.2, 0.8)}</rect><rect x="0" y="5" width="1" height="1" fill="#93c5fd">${blink(0.6, 0.8)}</rect>`,
  },
  {
    id: 'architect',
    category: 'Architect',
    name: 'Archie',
    color: '#8b5cf6',
    keywords: /\b(plan|architect|strateg|roadmap|outline|blueprint)/,
    hat: `<rect x="5" y="2" width="2" height="1" fill="#f3f4f6"/><rect x="3" y="3" width="6" height="2" fill="#f3f4f6"/><rect x="2" y="5" width="8" height="1" fill="#8b5cf6"/>`,
    hatMotion: NOD,
    overlay: line(2, 0, '#8b5cf6') + line(4, 0.5, '#c4b5fd') + `<rect x="0" y="2" width="1" height="3" fill="#8b5cf6" opacity="0.5"/>`,
  },
  {
    id: 'inspector',
    category: 'Inspector',
    name: 'Iris',
    color: '#14b8a6',
    keywords: /\b(review|audit|critique|lint|inspect|check)/,
    hat: `<rect x="3" y="3" width="6" height="2" fill="#14b8a6"/><rect x="3" y="3" width="6" height="1" fill="#0f8f82"/><rect x="2" y="5" width="9" height="1" fill="#0f766e"/>`,
    hatMotion: SCAN,
    overlay: `<g><rect x="9" y="1" width="3" height="1" fill="#5eead4"/><rect x="9" y="3" width="3" height="1" fill="#5eead4"/><rect x="9" y="2" width="1" height="1" fill="#5eead4"/><rect x="11" y="2" width="1" height="1" fill="#5eead4"/><animateTransform attributeName="transform" type="translate" values="0 0;-1 2;0 0" dur="1.4s" repeatCount="indefinite"/></g>`,
  },
  {
    id: 'guard',
    category: 'Guardian',
    name: 'Sir Lock',
    color: '#ef4444',
    keywords: /\b(secur|vulnerab|threat|auth|permission|safety|harden)/,
    hat: `<rect x="5" y="0" width="2" height="2" fill="#ef4444"/><rect x="3" y="2" width="6" height="4" fill="#9ca3af"/><rect x="4" y="4" width="4" height="1" fill="#1f2937"/>`,
    hatMotion: NONE,
    overlay: `<rect x="10" y="1" width="2" height="3" fill="#ef4444"><animate attributeName="fill" values="#ef4444;#fca5a5;#ef4444" dur="0.8s" repeatCount="indefinite"/></rect><rect x="10" y="4" width="1" height="1" fill="#ef4444"/>`,
  },
  {
    id: 'chemist',
    category: 'Tester',
    name: 'Fizz',
    color: '#22c55e',
    keywords: /\b(tests?|testing|qa|verify|validate|benchmark|experiment|assert)/,
    hat: `<rect x="2" y="3" width="8" height="1" fill="#374151"/><rect x="3" y="4" width="2" height="2" fill="#86efac"/><rect x="7" y="4" width="2" height="2" fill="#86efac"/><rect x="5" y="4" width="2" height="1" fill="#374151"/>`,
    hatMotion: NONE,
    overlay: rise(10, 0, '#86efac') + rise(11, 0.4, '#bbf7d0') + rise(9, 0.8, '#4ade80'),
  },
  {
    id: 'detective',
    category: 'Debugger',
    name: 'Sherl',
    color: '#a8794a',
    keywords: /\b(debug|bug|diagnos|investigat|root cause|trace|fix|crash)/,
    hat: `<rect x="5" y="2" width="2" height="1" fill="#6b5436"/><rect x="3" y="2" width="6" height="3" fill="#a8794a"/><rect x="2" y="4" width="1" height="2" fill="#8b6f47"/><rect x="9" y="4" width="1" height="2" fill="#8b6f47"/><rect x="2" y="5" width="8" height="1" fill="#6b5436"/>`,
    hatMotion: SCAN,
    overlay: `<g><rect x="9" y="3" width="3" height="1" fill="#e7c9a0"/><rect x="9" y="5" width="3" height="1" fill="#e7c9a0"/><rect x="9" y="4" width="1" height="1" fill="#e7c9a0"/><rect x="11" y="4" width="1" height="1" fill="#e7c9a0"/><animateTransform attributeName="transform" type="translate" values="0 0;-8 0;0 0" dur="2.4s" repeatCount="indefinite"/></g>`,
  },
  {
    id: 'scholar',
    category: 'Researcher',
    name: 'Sage',
    color: '#6366f1',
    keywords: /\b(research|competitor|study|analy[sz]|literature|compare|learn|investigate)/,
    hat: `<rect x="1" y="3" width="10" height="1" fill="#1f2937"/><rect x="3" y="4" width="6" height="2" fill="#374151"/><rect x="10" y="4" width="1" height="2" fill="#facc15"/>`,
    hatMotion: NOD,
    overlay: `<rect x="0" y="2" width="3" height="3" fill="#e5e7eb"/><rect x="1" y="2" width="1" height="3" fill="#9ca3af"/><rect x="1.5" y="2" width="1.5" height="3" fill="#ffffff"><animate attributeName="width" values="1.5;0;1.5" dur="0.9s" repeatCount="indefinite"/></rect>`,
  },
  {
    id: 'scribe',
    category: 'Writer',
    name: 'Penny',
    color: '#e11d48',
    keywords: /\b(document|docs?|write|writing|readme|copy|summar|draft|blog|changelog|translate)/,
    hat: `<rect x="3" y="3" width="6" height="3" fill="#9f1239"/><rect x="2" y="5" width="8" height="1" fill="#7f1d1d"/><rect x="9" y="1" width="1" height="3" fill="#f4f4f4"/><rect x="10" y="0" width="1" height="2" fill="#f4f4f4"/>`,
    hatMotion: NOD,
    overlay: line(2, 0, '#fda4af') + line(4, 0.4, '#fb7185') + `<rect x="10" y="6" width="1" height="1" fill="#fda4af">${blink(0.2, 0.6)}</rect>`,
  },
  {
    id: 'designer',
    category: 'Designer',
    name: 'Pixel',
    color: '#ec4899',
    keywords: /\b(design|ui|ux|graphic|logo|style|css|layout|visual|mock|brand|icon)/,
    hat: `<rect x="5" y="2" width="1" height="1" fill="#ec4899"/><rect x="3" y="3" width="7" height="2" fill="#ec4899"/><rect x="2" y="4" width="8" height="2" fill="#db2777"/>`,
    hatMotion: NOD,
    overlay: `<rect x="10" y="1" width="2" height="2" fill="#ef4444"><animate attributeName="fill" values="#ef4444;#facc15;#22c55e;#3b82f6;#ef4444" dur="1.6s" repeatCount="indefinite"/></rect><rect x="10" y="4" width="2" height="1" fill="#facc15"><animate attributeName="fill" values="#facc15;#22c55e;#3b82f6;#ef4444;#facc15" dur="1.6s" repeatCount="indefinite"/></rect>`,
  },
  {
    id: 'pilot',
    category: 'Release',
    name: 'Ace',
    color: '#1f9d6a',
    keywords: /\b(deploy|release|ship|launch|publish|ci|pipeline|rollout)/,
    hat: `<rect x="3" y="3" width="6" height="2" fill="#1f9d6a"/><rect x="5" y="3" width="2" height="2" fill="#ffffff"/><rect x="2" y="5" width="8" height="1" fill="#16805a"/><rect x="9" y="0" width="1" height="5" fill="#cccccc"/>`,
    hatMotion: NONE,
    overlay: `<rect x="10" y="0" width="2" height="2" fill="#ffffff"><animate attributeName="height" values="2;1;2" dur="0.5s" repeatCount="indefinite"/></rect>`,
  },
  {
    id: 'miner',
    category: 'Indexer',
    name: 'Dusty',
    color: '#c4572b',
    keywords: /\b(index|grep|crawl|dig|mine|scrape|extract|data|database|query)/,
    hat: `<rect x="3" y="2" width="6" height="3" fill="#7a4e2d"/><rect x="5" y="3" width="2" height="2" fill="#cfe9ff"/><rect x="2" y="5" width="8" height="1" fill="#c4572b"/>`,
    hatMotion: NONE,
    overlay: `<rect x="3" y="0" width="6" height="2" fill="#fff6b0" opacity="0"><animate attributeName="opacity" values="0;0.8;0" dur="0.9s" repeatCount="indefinite"/></rect>${rise(10, 0, '#fbbf24')}`,
  },
  {
    id: 'chef',
    category: 'Processor',
    name: 'Remy',
    color: '#fb923c',
    keywords: /\b(cook|process|transform|format|convert|generate|prepare|compile)/,
    hat: `<rect x="3" y="0" width="6" height="2" fill="#f4f4f4"/><rect x="2" y="1" width="8" height="3" fill="#f4f4f4"/><rect x="2" y="4" width="8" height="2" fill="#fb923c"/>`,
    hatMotion: NOD,
    overlay: rise(10, 0, '#e5e7eb') + rise(11, 0.5, '#9ca3af'),
  },
  {
    id: 'scout',
    category: 'Explorer',
    name: 'Rex',
    color: '#0ea5e9',
    keywords: /\b(explore|survey|scout|locate|discover|find|search)/,
    hat: `<rect x="3" y="3" width="6" height="2" fill="#d8bd7a"/><rect x="3" y="4" width="6" height="1" fill="#8b6f47"/><rect x="1" y="5" width="10" height="1" fill="#c2a15a"/>`,
    hatMotion: SCAN,
    overlay: `<rect x="10" y="3" width="1" height="1" fill="#0ea5e9">${blink(0)}</rect><rect x="11" y="2" width="1" height="3" fill="#0ea5e9">${blink(0.3)}</rect>`,
  },
  {
    id: 'builder',
    category: 'Builder',
    name: 'Bob',
    color: '#f5b800',
    keywords: /\b(build|implement|create|refactor|code|develop|add|make|landing|page|app)/,
    hat: `<rect x="5" y="2" width="2" height="1" fill="#f5b800"/><rect x="3" y="3" width="6" height="2" fill="#f5b800"/><rect x="5" y="3" width="2" height="1" fill="#c98a00"/><rect x="2" y="5" width="8" height="1" fill="#d99c00"/>`,
    hatMotion: NONE,
    overlay: `<g><rect x="10" y="2" width="1" height="4" fill="#8b5a3c"/><rect x="9" y="1" width="3" height="2" fill="#9ca3af"/><animateTransform attributeName="transform" type="rotate" values="-30 10.5 6;25 10.5 6;-30 10.5 6" dur="0.6s" repeatCount="indefinite"/></g><rect x="8" y="6" width="1" height="1" fill="#fde047">${blink(0.3, 0.6)}</rect>`,
  },
  {
    id: 'wizard',
    category: 'Specialist',
    name: 'Merlo',
    color: '#a855f7',
    keywords: null,
    hat: `<rect x="5" y="0" width="2" height="1" fill="#a855f7"/><rect x="4" y="1" width="4" height="1" fill="#a855f7"/><rect x="3" y="2" width="6" height="2" fill="#9333ea"/><rect x="2" y="4" width="8" height="2" fill="#7e22ce"/><rect x="5" y="3" width="1" height="1" fill="#fde047"/>`,
    hatMotion: NOD,
    overlay: `<rect x="1" y="2" width="1" height="1" fill="#fde047">${blink(0, 0.9)}</rect><rect x="10" y="1" width="1" height="1" fill="#fde047">${blink(0.4, 0.9)}</rect><rect x="0" y="4" width="1" height="1" fill="#e9d5ff">${blink(0.7, 0.9)}</rect>`,
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
