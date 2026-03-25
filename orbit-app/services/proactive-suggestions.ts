/**
 * Proactive Suggestions — location-aware, context-driven nudges from Merope.
 *
 * Merope notices things and suggests actions based on:
 * - Nearby landmarks
 * - Time of day patterns
 * - Motion state changes
 * - Battery level
 * - Duration at current location
 */

import type { OrbitContext } from '../engine/context'
import { Mode } from '../engine/mode-manager'

export interface Suggestion {
  id: string
  text: string
  suggestedMode?: Mode
  priority: 'low' | 'medium' | 'high'
  icon: string
}

// Known landmarks with radius in meters
const LANDMARKS = [
  { name: 'Parliament Hill', lat: 45.4236, lng: -75.7009, radius: 300, fact: 'The Centre Block was rebuilt after the 1916 fire — the library survived because a clerk closed the iron doors.' },
  { name: 'ByWard Market', lat: 45.4275, lng: -75.6930, radius: 400, fact: 'One of the oldest farmers markets in Canada, running since 1826!' },
  { name: 'National Gallery', lat: 45.4295, lng: -75.6989, radius: 200, fact: 'Home to the giant spider sculpture "Maman" by Louise Bourgeois.' },
  { name: 'Rideau Canal', lat: 45.4215, lng: -75.6950, radius: 500, fact: 'A UNESCO World Heritage Site — and the world\'s largest skating rink in winter!' },
  { name: 'Major\'s Hill Park', lat: 45.4280, lng: -75.6980, radius: 250, fact: 'Named after Major Daniel Bolton, the park offers incredible views of the Ottawa River.' },
  { name: 'Gatineau Park', lat: 45.4800, lng: -75.7800, radius: 2000, fact: 'Over 361 square kilometers of protected wilderness just minutes from downtown.' },
  { name: 'Canadian Museum of History', lat: 45.4307, lng: -75.7090, radius: 200, fact: 'The most visited museum in Canada, designed by Douglas Cardinal.' },
  { name: 'Château Laurier', lat: 45.4253, lng: -75.6950, radius: 150, fact: 'This grand hotel opened in 1912 — its original owner went down with the Titanic.' },
]

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Generate proactive suggestions based on current context.
 */
export function getSuggestions(context: OrbitContext, currentMode: Mode): Suggestion[] {
  const suggestions: Suggestion[] = []
  const loc = context.location

  // Landmark proximity suggestions
  if (loc) {
    for (const landmark of LANDMARKS) {
      const dist = haversineDistance(loc.lat, loc.lng, landmark.lat, landmark.lng)
      if (dist <= landmark.radius) {
        suggestions.push({
          id: `landmark-${landmark.name}`,
          text: `We're near ${landmark.name}! ${landmark.fact}`,
          suggestedMode: Mode.FOCUS,
          priority: 'medium',
          icon: '📍',
        })
      } else if (dist <= landmark.radius * 2) {
        suggestions.push({
          id: `landmark-nearby-${landmark.name}`,
          text: `${landmark.name} is about ${Math.round(dist)}m away — want to check it out?`,
          suggestedMode: Mode.GUIDE,
          priority: 'low',
          icon: '🧭',
        })
      }
    }
  }

  // Time-based suggestions
  if (context.time_of_day === 'morning' && currentMode !== Mode.GUIDE) {
    suggestions.push({
      id: 'morning-walk',
      text: "Beautiful morning! Perfect for a walk — want me to guide you somewhere?",
      suggestedMode: Mode.GUIDE,
      priority: 'low',
      icon: '🌅',
    })
  }

  if (context.time_of_day === 'evening') {
    suggestions.push({
      id: 'evening-capture',
      text: "Golden hour light! This would make a great memory.",
      suggestedMode: Mode.CAPTURE,
      priority: 'low',
      icon: '🌇',
    })
  }

  // Motion-based suggestions
  if (context.motion_state === 'walking' && currentMode === Mode.AMBIENT) {
    suggestions.push({
      id: 'walking-explore',
      text: "We're exploring! Want me to analyze what's around us?",
      suggestedMode: Mode.FOCUS,
      priority: 'low',
      icon: '🔍',
    })
  }

  if (context.motion_state === 'stationary' && currentMode !== Mode.CAPTURE) {
    suggestions.push({
      id: 'stationary-capture',
      text: "You've been here a while — worth saving this spot?",
      suggestedMode: Mode.CAPTURE,
      priority: 'low',
      icon: '📸',
    })
  }

  // Battery warnings
  if (context.battery_pct < 15) {
    suggestions.push({
      id: 'battery-critical',
      text: "Battery's getting low — I'll dim my glow to save power.",
      priority: 'high',
      icon: '🔋',
    })
  } else if (context.battery_pct < 30) {
    suggestions.push({
      id: 'battery-low',
      text: `Battery at ${context.battery_pct.toFixed(0)}% — I'll keep things efficient.`,
      priority: 'medium',
      icon: '🔋',
    })
  }

  return suggestions
}

/**
 * Get the single most relevant suggestion.
 */
export function getTopSuggestion(context: OrbitContext, currentMode: Mode): Suggestion | null {
  const all = getSuggestions(context, currentMode)
  if (all.length === 0) return null

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  all.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return all[0]
}
