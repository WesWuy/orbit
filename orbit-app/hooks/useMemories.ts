/**
 * useMemories — React hook for the memory store.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { InMemoryStore, type MemoryStore, type Memory } from '../services/memory-store'

export function useMemories() {
  const store = useRef<MemoryStore>(new InMemoryStore()).current
  const [memories, setMemories] = useState<Memory[]>([])
  const [count, setCount] = useState(0)

  useEffect(() => {
    store.init()
  }, [store])

  const refresh = useCallback(async () => {
    const all = await store.getRecent(50)
    setMemories(all)
    setCount(await store.count())
  }, [store])

  const save = useCallback(async (memory: Omit<Memory, 'id'>): Promise<number> => {
    const id = await store.save(memory)
    await refresh()
    return id
  }, [store, refresh])

  const search = useCallback(async (query: string): Promise<Memory[]> => {
    return store.search(query)
  }, [store])

  const remove = useCallback(async (id: number) => {
    await store.delete(id)
    await refresh()
  }, [store, refresh])

  return { memories, count, save, search, remove, refresh }
}
