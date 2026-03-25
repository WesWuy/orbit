/**
 * REST API client for Orbit Runtime.
 *
 * Note: Commands now go through the WebSocket protocol (not REST).
 * This client is kept for status polling and non-realtime endpoints.
 */

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  getStatus: () => request<Record<string, unknown>>('/status'),
}
