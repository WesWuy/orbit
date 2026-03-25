/**
 * AI Client — abstraction over LLM APIs.
 *
 * Supports mock mode (offline dev) and real mode (Claude/OpenAI).
 * All AI features go through this client.
 */

import type { OrbitContext } from '../engine/context'

export interface VisionResult {
  description: string
  objects: { label: string; confidence: number }[]
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIClient {
  /** Analyze a camera frame / photo */
  analyzeImage(imageBase64: string, context: OrbitContext): Promise<VisionResult>

  /** Chat with Orbit */
  chat(messages: ConversationMessage[], context: OrbitContext): Promise<string>

  /** Generate a description for a captured memory */
  describeCapture(imageBase64: string, context: OrbitContext): Promise<string>

  /** Search memories by natural language */
  searchQuery(query: string): Promise<string[]>
}

// ── Mock AI Client (offline dev) ──

const MOCK_DESCRIPTIONS = [
  'A tree-lined path through a city park with dappled sunlight filtering through the canopy.',
  'A modern glass building reflecting the clouds. Looks like an office complex or cultural center.',
  'A busy intersection with pedestrians crossing. There\'s a café on the corner with outdoor seating.',
  'A historic stone church with Gothic arched windows and a copper-green steeple.',
  'A bridge spanning a river with kayakers passing underneath. The water looks calm today.',
  'A mural covering the entire side of a building — bold colors, abstract shapes, local artists.',
  'A farmers market with vendors selling fresh produce, flowers, and artisanal breads.',
  'A quiet residential street with mature maples. The houses are early 20th century brick.',
]

const MOCK_OBJECTS = [
  [{ label: 'tree', confidence: 0.95 }, { label: 'path', confidence: 0.88 }, { label: 'bench', confidence: 0.72 }],
  [{ label: 'building', confidence: 0.97 }, { label: 'glass facade', confidence: 0.85 }, { label: 'sky reflection', confidence: 0.7 }],
  [{ label: 'crosswalk', confidence: 0.92 }, { label: 'pedestrian', confidence: 0.89 }, { label: 'café', confidence: 0.78 }],
  [{ label: 'church', confidence: 0.96 }, { label: 'steeple', confidence: 0.91 }, { label: 'stone wall', confidence: 0.83 }],
  [{ label: 'bridge', confidence: 0.94 }, { label: 'river', confidence: 0.93 }, { label: 'kayak', confidence: 0.67 }],
]

const MOCK_CHAT_RESPONSES = [
  "That's a great question! Based on where you are in Ottawa, you're near the ByWard Market area. Lots of great spots to explore nearby.",
  "I'd recommend checking out the path along the Rideau Canal — it's beautiful this time of year, especially at sunset.",
  "From what I can see, you're moving at a good walking pace. Want me to remember any spots along the way?",
  "Interesting! The architecture around here is a mix of heritage limestone and modern glass. Ottawa does that contrast really well.",
  "I've been keeping track — you've walked about 2.3 km so far this session. Not bad!",
]

export class MockAIClient implements AIClient {
  private _chatIndex = 0

  async analyzeImage(_imageBase64: string, _context: OrbitContext): Promise<VisionResult> {
    // Simulate ~1.5s API latency
    await delay(1500)
    const i = Math.floor(Math.random() * MOCK_DESCRIPTIONS.length)
    return {
      description: MOCK_DESCRIPTIONS[i],
      objects: MOCK_OBJECTS[i % MOCK_OBJECTS.length],
    }
  }

  async chat(_messages: ConversationMessage[], _context: OrbitContext): Promise<string> {
    await delay(1000)
    const response = MOCK_CHAT_RESPONSES[this._chatIndex % MOCK_CHAT_RESPONSES.length]
    this._chatIndex++
    return response
  }

  async describeCapture(_imageBase64: string, context: OrbitContext): Promise<string> {
    await delay(1200)
    const i = Math.floor(Math.random() * MOCK_DESCRIPTIONS.length)
    const loc = context.location
    const locStr = loc ? ` (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})` : ''
    return `${MOCK_DESCRIPTIONS[i]}${locStr}`
  }

  async searchQuery(query: string): Promise<string[]> {
    await delay(500)
    return [`Memory matching "${query}" — captured near the canal at 3:42 PM`]
  }
}

// ── Real AI Client (cloud API) ──

export class CloudAIClient implements AIClient {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:8001') {
    this.baseUrl = baseUrl
  }

  async analyzeImage(imageBase64: string, context: OrbitContext): Promise<VisionResult> {
    const res = await fetch(`${this.baseUrl}/api/vision/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64, context }),
    })
    return res.json()
  }

  async chat(messages: ConversationMessage[], context: OrbitContext): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context }),
    })
    const data = await res.json()
    return data.response
  }

  async describeCapture(imageBase64: string, context: OrbitContext): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/vision/describe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64, context }),
    })
    const data = await res.json()
    return data.description
  }

  async searchQuery(query: string): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/api/memory/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    const data = await res.json()
    return data.results
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
