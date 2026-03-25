import type { CommandEntry, SafetyEvent } from '../lib/types'

interface Props {
  history: CommandEntry[]
  safetyEvents: SafetyEvent[]
}

export function AlertsPanel({ history, safetyEvents }: Props) {
  // Merge command history and safety events into a single timeline
  type TimelineEntry =
    | { kind: 'command'; timestamp: number; text: string; accepted: boolean; message: string }
    | { kind: 'safety'; timestamp: number; code: string; message: string }

  const timeline: TimelineEntry[] = [
    ...history.map((e) => ({
      kind: 'command' as const,
      timestamp: e.timestamp,
      text: e.text,
      accepted: e.result.accepted,
      message: e.result.message,
    })),
    ...safetyEvents.map((e) => ({
      kind: 'safety' as const,
      timestamp: e.timestamp,
      code: e.code,
      message: e.message,
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 12)

  return (
    <div className="orbit-card" style={{ maxHeight: '200px' }}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-orbit-muted mb-2">Activity</h3>
      <div className="space-y-1 overflow-y-auto">
        {timeline.length === 0 && (
          <p className="text-xs text-orbit-muted italic">No activity yet</p>
        )}
        {timeline.map((entry, i) => {
          const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
          if (entry.kind === 'safety') {
            return (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-orbit-muted font-mono shrink-0">{time}</span>
                <span className="text-orbit-warning font-semibold">{entry.code}</span>
                <span className="text-orbit-warning">{entry.message}</span>
              </div>
            )
          }
          return (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-orbit-muted font-mono shrink-0">{time}</span>
              <span className={entry.accepted ? 'text-orbit-text' : 'text-orbit-danger'}>
                {entry.message}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
