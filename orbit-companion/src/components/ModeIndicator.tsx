const MODE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  idle: { label: 'IDLE', icon: '◯', color: 'text-orbit-muted' },
  orbit: { label: 'ORBIT', icon: '◎', color: 'text-orbit-accent' },
  focus: { label: 'FOCUS', icon: '◉', color: 'text-cyan-400' },
  guide: { label: 'GUIDE', icon: '→', color: 'text-emerald-400' },
  capture: { label: 'CAPTURE', icon: '●', color: 'text-rose-400' },
  dock: { label: 'DOCK', icon: '⌂', color: 'text-amber-400' },
  emergency: { label: 'EMERGENCY', icon: '⚠', color: 'text-orbit-danger' },
}

const SAFETY_COLORS: Record<string, string> = {
  nominal: 'bg-orbit-success',
  warning: 'bg-orbit-warning',
  critical: 'bg-orbit-danger orbit-pulse',
  emergency: 'bg-orbit-danger orbit-pulse',
}

interface Props {
  mode: string
  safetyState: string
  flightState: string
}

export function ModeIndicator({ mode, safetyState, flightState }: Props) {
  const config = MODE_CONFIG[mode] ?? MODE_CONFIG['idle']!
  const safetyColor = SAFETY_COLORS[safetyState] ?? SAFETY_COLORS['nominal']

  return (
    <div className="orbit-card flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${safetyColor}`} />
        <div>
          <div className={`text-lg font-semibold tracking-wide ${config.color}`}>
            <span className="mr-2">{config.icon}</span>
            {config.label}
          </div>
          <div className="text-xs text-orbit-muted uppercase tracking-wider">
            {flightState.replace('_', ' ')}
          </div>
        </div>
      </div>
      <div className="text-xs text-orbit-muted uppercase">{safetyState}</div>
    </div>
  )
}
