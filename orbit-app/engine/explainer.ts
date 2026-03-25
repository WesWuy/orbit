/**
 * Orbit Explainer — Merope speaks through status messages.
 *
 * Originally a generic explainer, now powered by Merope's personality.
 * She speaks in first person, uses "we" language, and adapts to context.
 */

import { Mode } from './mode-manager'
import type { OrbitContext } from './context'
import { getMeropeGreeting } from './merope'

const MODE_EXPLANATIONS: Record<Mode, (ctx: OrbitContext) => string> = {
  [Mode.SLEEP]: () => "Shhh... I'm resting. Tap to wake me up.",
  [Mode.AMBIENT]: (ctx) => {
    if (ctx.motion_state === 'stationary') return "I'm here, watching. Point your camera at something and I'll tell you about it."
    if (ctx.motion_state === 'walking') return "Walking with you! Need directions or want me to capture something?"
    if (ctx.motion_state === 'vehicle') return "Looks like we're on the move. I'll keep things quiet."
    return "I'm with you, ready when you need me."
  },
  [Mode.FOCUS]: () => "Ooh, let me take a closer look at this...",
  [Mode.GUIDE]: (ctx) => {
    if (ctx.speed_kmh > 1) return "Follow the compass — I'll guide you with audio pings."
    return "Where do you want to go? I know a few good spots."
  },
  [Mode.CAPTURE]: () => "Something worth remembering? Let me save this moment.",
  [Mode.CONVERSE]: (ctx) => getMeropeGreeting(Mode.CONVERSE, ctx),
}

export function explain(mode: Mode, context: OrbitContext): string {
  const fn = MODE_EXPLANATIONS[mode]
  return fn ? fn(context) : "I'm ready when you are."
}

/** Short status line for the status bar */
export function statusLine(mode: Mode, context: OrbitContext): string {
  const battery = context.battery_pct < 20 ? ` · Battery ${context.battery_pct.toFixed(0)}%` : ''
  const online = context.is_online ? '' : ' · Offline'
  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1)
  return `Merope · ${modeLabel}${battery}${online}`
}
