/**
 * Location Tracker — destination management for Guide mode.
 *
 * Maintains a target destination and computes bearing/distance
 * from the user's current position.
 */

import { distanceM, bearingDeg } from '../lib/geo-utils'

export interface Destination {
  name: string
  lat: number
  lng: number
}

export interface GuideState {
  destination: Destination | null
  distanceM: number
  bearingDeg: number
  arrived: boolean
}

const ARRIVAL_THRESHOLD_M = 15 // Within 15m = arrived

// Pre-loaded destinations for Ottawa/Gatineau demo
const KNOWN_PLACES: Record<string, Destination> = {
  'parliament': { name: 'Parliament Hill', lat: 45.4236, lng: -75.7009 },
  'parliament hill': { name: 'Parliament Hill', lat: 45.4236, lng: -75.7009 },
  'byward market': { name: 'ByWard Market', lat: 45.4275, lng: -75.6920 },
  'market': { name: 'ByWard Market', lat: 45.4275, lng: -75.6920 },
  'rideau canal': { name: 'Rideau Canal', lat: 45.4215, lng: -75.6919 },
  'canal': { name: 'Rideau Canal', lat: 45.4215, lng: -75.6919 },
  'national gallery': { name: 'National Gallery of Canada', lat: 45.4296, lng: -75.6988 },
  'gallery': { name: 'National Gallery of Canada', lat: 45.4296, lng: -75.6988 },
  'museum of history': { name: 'Canadian Museum of History', lat: 45.4308, lng: -75.7091 },
  'museum': { name: 'Canadian Museum of History', lat: 45.4308, lng: -75.7091 },
  'gatineau park': { name: 'Gatineau Park Entrance', lat: 45.4768, lng: -75.7508 },
  'park': { name: 'Major\'s Hill Park', lat: 45.4279, lng: -75.6977 },
  'majors hill': { name: 'Major\'s Hill Park', lat: 45.4279, lng: -75.6977 },
  'coffee': { name: 'ByWard Market (Coffee)', lat: 45.4275, lng: -75.6920 },
  'coffee shop': { name: 'ByWard Market (Coffee)', lat: 45.4275, lng: -75.6920 },
  'home': { name: 'Starting Point', lat: 45.4215, lng: -75.6972 },
}

export class LocationTracker {
  private _destination: Destination | null = null

  get destination(): Destination | null {
    return this._destination
  }

  /** Try to resolve a text query to a known destination */
  resolveDestination(query: string): Destination | null {
    const lower = query.toLowerCase().trim()

    // Check known places
    for (const [key, dest] of Object.entries(KNOWN_PLACES)) {
      if (lower.includes(key)) {
        return dest
      }
    }

    // Check for "nearest X" pattern
    const nearestMatch = lower.match(/nearest\s+(.+)/)
    if (nearestMatch) {
      const target = nearestMatch[1].trim()
      for (const [key, dest] of Object.entries(KNOWN_PLACES)) {
        if (key.includes(target) || target.includes(key)) {
          return dest
        }
      }
    }

    return null
  }

  /** Set the current navigation target */
  setDestination(dest: Destination): void {
    this._destination = dest
  }

  /** Clear the destination */
  clearDestination(): void {
    this._destination = null
  }

  /** Compute current guide state from user position */
  getGuideState(userLat: number, userLng: number): GuideState {
    if (!this._destination) {
      return { destination: null, distanceM: 0, bearingDeg: 0, arrived: false }
    }

    const dist = distanceM(userLat, userLng, this._destination.lat, this._destination.lng)
    const bearing = bearingDeg(userLat, userLng, this._destination.lat, this._destination.lng)

    return {
      destination: this._destination,
      distanceM: dist,
      bearingDeg: bearing,
      arrived: dist < ARRIVAL_THRESHOLD_M,
    }
  }
}
