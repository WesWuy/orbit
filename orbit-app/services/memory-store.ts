/**
 * Memory Store — local SQLite database for captured memories.
 *
 * Stores photos, locations, AI descriptions, and timestamps.
 * Supports search by text query (simple LIKE for now, embeddings later).
 */

export interface Memory {
  id: number
  timestamp: number
  lat: number | null
  lng: number | null
  alt: number | null
  heading_deg: number
  photo_uri: string | null
  description: string
  mode: string
}

export interface MemoryStore {
  init(): Promise<void>
  save(memory: Omit<Memory, 'id'>): Promise<number>
  getAll(): Promise<Memory[]>
  getRecent(limit: number): Promise<Memory[]>
  search(query: string): Promise<Memory[]>
  getById(id: number): Promise<Memory | null>
  delete(id: number): Promise<void>
  count(): Promise<number>
}

// ── In-memory store (works on web + dev without SQLite) ──

export class InMemoryStore implements MemoryStore {
  private _memories: Memory[] = []
  private _nextId = 1

  async init(): Promise<void> {
    // No-op for in-memory
  }

  async save(memory: Omit<Memory, 'id'>): Promise<number> {
    const id = this._nextId++
    this._memories.push({ ...memory, id })
    return id
  }

  async getAll(): Promise<Memory[]> {
    return [...this._memories].reverse()
  }

  async getRecent(limit: number): Promise<Memory[]> {
    return [...this._memories].reverse().slice(0, limit)
  }

  async search(query: string): Promise<Memory[]> {
    const lower = query.toLowerCase()
    return this._memories.filter((m) =>
      m.description.toLowerCase().includes(lower)
    ).reverse()
  }

  async getById(id: number): Promise<Memory | null> {
    return this._memories.find((m) => m.id === id) ?? null
  }

  async delete(id: number): Promise<void> {
    this._memories = this._memories.filter((m) => m.id !== id)
  }

  async count(): Promise<number> {
    return this._memories.length
  }
}

// SQLiteStore omitted for web compatibility.
// On native builds, swap InMemoryStore for a SQLite-backed implementation
// using expo-sqlite. The InMemoryStore works for both web and native dev.
