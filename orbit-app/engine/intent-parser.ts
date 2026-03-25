/**
 * Orbit Gen 1 Intent Parser — offline keyword-based fallback.
 *
 * Ported from orbit-runtime/orbit/brain/intent_parser.py.
 * Maps user text to intents for Gen 1 phone modes.
 * This runs on-device with zero latency — no network needed.
 * Cloud LLM handles complex queries; this handles quick commands.
 */

export enum IntentType {
  FOCUS = 'focus',           // "what is this", "look at", "identify"
  GUIDE = 'guide',           // "take me to", "navigate", "guide me"
  CAPTURE = 'capture',       // "remember this", "save this", "bookmark"
  CONVERSE = 'converse',     // "let's talk", "hey orbit"
  EFFICIENCY = 'efficiency', // "plan my day", "habits", "schedule"
  SLEEP = 'sleep',           // "sleep", "goodnight", "stop"
  AMBIENT = 'ambient',       // "ambient", "chill", "passive"
  SEARCH_MEMORY = 'search_memory', // "where was", "find the", "show me that"
  STATUS = 'status',         // "status", "how are you", "battery"
  UNKNOWN = 'unknown',
}

interface ParsedIntent {
  type: IntentType
  confidence: number  // 0-1
  raw: string
  params: Record<string, string>
}

const PATTERNS: { type: IntentType; keywords: string[]; extract?: (text: string) => Record<string, string> }[] = [
  {
    type: IntentType.FOCUS,
    keywords: ['what is this', 'what am i looking at', 'identify', 'what\'s that', 'look at', 'analyze', 'scan'],
  },
  {
    type: IntentType.GUIDE,
    keywords: ['take me to', 'guide me', 'navigate to', 'directions to', 'how do i get to', 'find nearby', 'nearest'],
    extract: (text: string) => {
      const match = text.match(/(?:take me to|guide me to|navigate to|directions to|how do i get to|find nearby|nearest)\s+(.+)/i)
      return match ? { destination: match[1].trim() } : {}
    },
  },
  {
    type: IntentType.CAPTURE,
    keywords: ['remember this', 'save this', 'bookmark', 'save this spot', 'capture', 'save location', 'remember'],
  },
  {
    type: IntentType.EFFICIENCY,
    keywords: ['plan my day', 'schedule', 'habits', 'routine', 'time block', 'efficiency', 'plan today', 'organize my day', 'life architect', 'what should i do', 'daily plan'],
  },
  {
    type: IntentType.CONVERSE,
    keywords: ['let\'s talk', 'hey orbit', 'talk to me', 'chat', 'conversation'],
  },
  {
    type: IntentType.SLEEP,
    keywords: ['sleep', 'goodnight', 'stop', 'quiet', 'shut down', 'power down'],
  },
  {
    type: IntentType.AMBIENT,
    keywords: ['ambient', 'chill', 'passive', 'relax', 'background', 'wake up'],
  },
  {
    type: IntentType.SEARCH_MEMORY,
    keywords: ['where was', 'find the', 'show me that', 'when did i', 'search memories', 'recall'],
    extract: (text: string) => {
      const match = text.match(/(?:where was|find the|show me that|when did i|search memories|recall)\s+(.+)/i)
      return match ? { query: match[1].trim() } : {}
    },
  },
  {
    type: IntentType.STATUS,
    keywords: ['status', 'how are you', 'battery', 'what mode', 'state'],
  },
]

export function parseIntent(text: string): ParsedIntent {
  const lower = text.toLowerCase().trim()

  if (!lower) {
    return { type: IntentType.UNKNOWN, confidence: 0, raw: text, params: {} }
  }

  for (const pattern of PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (lower.includes(keyword)) {
        const params = pattern.extract ? pattern.extract(lower) : {}
        return {
          type: pattern.type,
          confidence: keyword.length / lower.length, // Longer match = higher confidence
          raw: text,
          params,
        }
      }
    }
  }

  return { type: IntentType.UNKNOWN, confidence: 0, raw: text, params: {} }
}
