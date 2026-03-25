/**
 * Orbit Gen 1 Mode Manager — Finite State Machine.
 *
 * Ported from orbit-runtime/orbit/core/mode_manager.py.
 * Modes adapted for phone-as-Orbit: no flight modes, replaced with
 * spatial awareness modes.
 */

export enum Mode {
  AMBIENT = 'ambient',     // Passive — pocket/hand, listening, low power
  FOCUS = 'focus',         // Camera active — "What am I looking at?"
  GUIDE = 'guide',         // Navigation — spatial audio + AR arrow
  CAPTURE = 'capture',     // "Remember this" — photo + location + AI
  CONVERSE = 'converse',   // Voice conversation with Orbit
  SLEEP = 'sleep',         // Low power / idle
}

/** Valid transitions: from -> allowed destinations */
const TRANSITIONS: Record<Mode, Mode[]> = {
  [Mode.SLEEP]:    [Mode.AMBIENT, Mode.FOCUS, Mode.CONVERSE],
  [Mode.AMBIENT]:  [Mode.FOCUS, Mode.GUIDE, Mode.CAPTURE, Mode.CONVERSE, Mode.SLEEP],
  [Mode.FOCUS]:    [Mode.AMBIENT, Mode.GUIDE, Mode.CAPTURE, Mode.CONVERSE, Mode.SLEEP],
  [Mode.GUIDE]:    [Mode.AMBIENT, Mode.FOCUS, Mode.CAPTURE, Mode.CONVERSE, Mode.SLEEP],
  [Mode.CAPTURE]:  [Mode.AMBIENT, Mode.FOCUS, Mode.GUIDE, Mode.CONVERSE, Mode.SLEEP],
  [Mode.CONVERSE]: [Mode.AMBIENT, Mode.FOCUS, Mode.GUIDE, Mode.CAPTURE, Mode.SLEEP],
}

export interface ModeTransition {
  from: Mode
  to: Mode
  timestamp: number
  reason: string
}

export class ModeManager {
  private _current: Mode = Mode.SLEEP
  private _history: ModeTransition[] = []

  get current(): Mode {
    return this._current
  }

  get history(): readonly ModeTransition[] {
    return this._history
  }

  /** Check if a transition is valid without performing it. */
  canTransition(to: Mode): boolean {
    if (to === this._current) return false
    return TRANSITIONS[this._current]?.includes(to) ?? false
  }

  /** Attempt a transition. Returns true if successful. */
  transition(to: Mode, reason: string = ''): boolean {
    if (!this.canTransition(to)) return false
    this._recordTransition(to, reason)
    return true
  }

  /** Force a transition regardless of rules (for system overrides). */
  forceTransition(to: Mode, reason: string = ''): void {
    this._recordTransition(to, reason)
  }

  /** Get all valid transitions from current mode. */
  availableTransitions(): Mode[] {
    return TRANSITIONS[this._current] ?? []
  }

  private _recordTransition(to: Mode, reason: string): void {
    const transition: ModeTransition = {
      from: this._current,
      to,
      timestamp: Date.now(),
      reason,
    }
    this._history.push(transition)
    // Keep last 50 transitions
    if (this._history.length > 50) {
      this._history = this._history.slice(-50)
    }
    this._current = to
  }
}
