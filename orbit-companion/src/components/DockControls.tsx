interface Props {
  flightState: string
  mode: string
  onLaunch: () => void
  onLand: () => void
  onDock: () => void
  onModeSwitch: (mode: string) => void
  loading: boolean
}

export function DockControls({ flightState, mode, onLaunch, onLand, onDock, onModeSwitch, loading }: Props) {
  const isGrounded = flightState === 'grounded' || flightState === 'docked'
  const isAirborne = flightState === 'airborne'

  return (
    <div className="orbit-card">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-orbit-muted mb-3">Controls</h3>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onLaunch}
          disabled={!isGrounded || loading}
          className="orbit-btn-primary py-3"
        >
          Launch
        </button>
        <button
          onClick={onLand}
          disabled={!isAirborne || loading}
          className="orbit-btn-ghost border border-orbit-border py-3"
        >
          Land
        </button>
        <button
          onClick={onDock}
          disabled={!isAirborne || mode === 'dock' || loading}
          className="orbit-btn-ghost border border-orbit-border py-3"
        >
          Dock
        </button>
      </div>

      {/* Mode quick-switch */}
      <div className="grid grid-cols-4 gap-1.5 mt-3">
        {(['orbit', 'focus', 'guide', 'capture'] as const).map((m) => (
          <ModeButton
            key={m}
            mode={m}
            active={mode === m}
            disabled={!isAirborne || loading}
            onClick={() => onModeSwitch(m)}
          />
        ))}
      </div>
    </div>
  )
}

function ModeButton({ mode, active, disabled, onClick }: { mode: string; active: boolean; disabled: boolean; onClick: () => void }) {
  const label = mode.charAt(0).toUpperCase() + mode.slice(1)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`orbit-btn text-xs py-1.5 ${
        active
          ? 'bg-orbit-accent/20 text-orbit-accent border border-orbit-accent/30'
          : 'bg-transparent text-orbit-muted border border-orbit-border hover:text-orbit-text'
      }`}
    >
      {label}
    </button>
  )
}
