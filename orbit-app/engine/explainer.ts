/**
 * Orbit Explainer — human-readable state descriptions.
 *
 * Ported from orbit-runtime/orbit/brain/explainer.py.
 * Gives Orbit a personality through contextual status messages.
 */

import { Mode } from './mode-manager'
import type { OrbitContext } from './context'

const MODE_EXPLANATIONS: Record<Mode, (ctx: OrbitContext) => string> = {
  [Mode.SLEEP]: () => "Orbit is resting. Say 'wake up' to start.",
  [Mode.AMBIENT]: (ctx) => {
    if (ctx.motion_state === 'stationary') return "Orbit is here, listening. Point your camera to explore."
    if (ctx.motion_state === 'walking') return "Walking with you. Need directions or want to capture something?"
    if (ctx.motion_state === 'vehicle') return "Looks like you're on the move. I'll keep things quiet."
    return "Orbit is with you, ready when you need me."
  },
  [Mode.FOCUS]: () => "Camera active — point at anything and I'll tell you about it.",
  [Mode.GUIDE]: (ctx) => {
    if (ctx.speed_kmh > 1) return "Guiding you — follow the spatial audio cues."
    return "Ready to guide. Tell me where you want to go."
  },
  [Mode.CAPTURE]: () => "Capture mode — I'll remember this moment for you.",
  [Mode.CONVERSE]: (ctx) => {
    const greeting = ctx.time_of_day === 'morning' ? 'Good morning' :
                     ctx.time_of_day === 'evening' ? 'Good evening' :
                     ctx.time_of_day === 'night' ? 'Night owl mode' : 'Hey there'
    return `${greeting}! Let's chat. What's on your mind?`
  },
}

export function explain(mode: Mode, context: OrbitContext): string {
  const fn = MODE_EXPLANATIONS[mode]
  return fn ? fn(context) : 'Orbit is ready.'
}

/** Short status line for the status bar */
export function statusLine(mode: Mode, context: OrbitContext): string {
  const battery = context.battery_pct < 20 ? ` · Battery ${context.battery_pct.toFixed(0)}%` : ''
  const online = context.is_online ? '' : ' · Offline'
  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1)
  return `${modeLabel}${battery}${online}`
}
