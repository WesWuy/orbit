import type { OrbitState } from '../lib/types'

interface Props {
  state: OrbitState
  onEstop: () => void
  onResetEstop: () => void
}

export function SafetyStatus({ state, onEstop, onResetEstop }: Props) {
  const isEmergency = state.estop_active || state.safety_state === 'emergency'

  return (
    <div className={`orbit-card ${isEmergency ? 'border-orbit-danger' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-orbit-muted">Safety</h3>
        {state.estop_active && (
          <span className="text-xs text-orbit-danger font-semibold orbit-pulse">E-STOP ACTIVE</span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEstop}
          className="orbit-btn-danger flex-1 text-base font-bold py-3"
        >
          EMERGENCY STOP
        </button>
        {state.estop_active && (
          <button
            onClick={onResetEstop}
            className="orbit-btn-ghost border border-orbit-border flex-1"
          >
            Reset E-Stop
          </button>
        )}
      </div>

      <div className="mt-3 text-sm text-orbit-muted">{state.explanation}</div>
    </div>
  )
}
