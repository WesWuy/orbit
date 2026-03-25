import type { OrbitState } from '../lib/types'

interface Props {
  state: OrbitState
}

function Stat({ label, value, unit, warn }: { label: string; value: string | number; unit?: string; warn?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-orbit-muted">{label}</span>
      <span className={`text-lg font-mono font-medium ${warn ? 'text-orbit-warning' : 'text-orbit-text'}`}>
        {value}
        {unit && <span className="text-xs text-orbit-muted ml-0.5">{unit}</span>}
      </span>
    </div>
  )
}

export function TelemetryPanel({ state }: Props) {
  return (
    <div className="orbit-card">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-orbit-muted mb-3">Telemetry</h3>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Battery" value={state.battery_pct.toFixed(0)} unit="%" warn={state.battery_pct < 20} />
        <Stat label="Altitude" value={state.altitude_m.toFixed(1)} unit="m" />
        <Stat label="Speed" value={state.speed_ms.toFixed(1)} unit="m/s" />
        <Stat label="Target" value={state.target_locked ? `${state.target_distance_m.toFixed(0)}m` : '---'} />
        <Stat label="Dock" value={state.dock_distance_m.toFixed(0)} unit="m" />
        <Stat label="Sim Time" value={state.sim_time.toFixed(0)} unit="s" />
      </div>

      {/* Position bar */}
      <div className="mt-3 pt-3 border-t border-orbit-border">
        <div className="flex justify-between text-[10px] font-mono text-orbit-muted">
          <span>X: {state.position.x.toFixed(1)}</span>
          <span>Y: {state.position.y.toFixed(1)}</span>
          <span>Z: {state.position.z.toFixed(1)}</span>
          <span>HDG: {state.heading_deg.toFixed(0)}°</span>
        </div>
      </div>
    </div>
  )
}
