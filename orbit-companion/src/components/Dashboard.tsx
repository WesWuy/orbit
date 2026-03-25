import { useOrbitProtocol } from '../hooks/useTelemetry'
import { useCommands } from '../hooks/useCommands'
import { ModeIndicator } from './ModeIndicator'
import { TelemetryPanel } from './TelemetryPanel'
import { SafetyStatus } from './SafetyStatus'
import { DockControls } from './DockControls'
import { CommandConsole } from './CommandConsole'
import { AlertsPanel } from './AlertsPanel'
import { SimView } from './SimView'

export function Dashboard() {
  const { state, connected, safetyEvents, sendCommand: protocolSend, clearSafetyEvents } = useOrbitProtocol()
  const { history, sendCommand, quickAction, loading } = useCommands(protocolSend)

  return (
    <div className="min-h-screen bg-orbit-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-orbit-bg/90 backdrop-blur-sm border-b border-orbit-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orbit-accent orbit-glow" />
            <h1 className="text-lg font-semibold tracking-tight">Orbit</h1>
            <span className="text-[10px] text-orbit-muted">COMPANION</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-orbit-muted">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-orbit-success' : 'bg-orbit-danger orbit-pulse'}`} />
            {connected ? 'Linked to Runtime' : 'Disconnected'}
          </div>
        </div>
      </header>

      {/* Disconnect banner */}
      {!connected && (
        <div className="bg-orbit-danger/10 border-b border-orbit-danger/30 px-4 py-2 text-center text-xs text-orbit-danger">
          Orbit Runtime disconnected — drone continues safe local behavior
        </div>
      )}

      {/* Safety event banner */}
      {safetyEvents.length > 0 && (() => {
        const latest = safetyEvents[safetyEvents.length - 1]!
        return (
        <div className="bg-orbit-warning/10 border-b border-orbit-warning/30 px-4 py-2">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="text-xs text-orbit-warning">
              <span className="font-semibold">{latest.code}:</span>{' '}
              {latest.message}
            </div>
            <button onClick={clearSafetyEvents} className="text-[10px] text-orbit-muted hover:text-orbit-text ml-2">
              dismiss
            </button>
          </div>
        </div>
        )
      })()}

      {/* Main content — single column, mobile-first */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-3 pb-8">
        <ModeIndicator
          mode={state.mode}
          safetyState={state.safety_state}
          flightState={state.flight_state}
        />

        <SimView state={state} />

        <TelemetryPanel state={state} />

        <DockControls
          flightState={state.flight_state}
          mode={state.mode}
          onLaunch={() => quickAction('launch')}
          onLand={() => quickAction('land')}
          onDock={() => quickAction('dock')}
          onModeSwitch={(mode) => quickAction(mode)}
          loading={loading}
        />

        <SafetyStatus
          state={state}
          onEstop={() => quickAction('estop')}
          onResetEstop={() => quickAction('resetEstop')}
        />

        <CommandConsole
          history={history}
          onSend={sendCommand}
          loading={loading}
        />

        <AlertsPanel history={history} safetyEvents={safetyEvents} />

        {/* Footer */}
        <div className="text-center text-[10px] text-orbit-muted pt-4">
          ORBIT v0.1.0 — Companion App — Simulation Mode
        </div>
      </main>
    </div>
  )
}
