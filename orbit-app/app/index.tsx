/**
 * Orbit Gen 1 — Main Screen.
 *
 * The home screen shows current mode, sensor data, contextual explanation,
 * and mode switching controls. This is the ambient/default view.
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { useOrbitEngine } from '../hooks/useOrbitEngine'
import { Mode } from '../engine/mode-manager'

const MODE_ICONS: Record<Mode, string> = {
  [Mode.SLEEP]: '🌙',
  [Mode.AMBIENT]: '👁',
  [Mode.FOCUS]: '🔍',
  [Mode.GUIDE]: '🧭',
  [Mode.CAPTURE]: '📸',
  [Mode.CONVERSE]: '💬',
}

const MODE_COLORS: Record<Mode, string> = {
  [Mode.SLEEP]: '#6b7280',
  [Mode.AMBIENT]: '#3b82f6',
  [Mode.FOCUS]: '#8b5cf6',
  [Mode.GUIDE]: '#10b981',
  [Mode.CAPTURE]: '#f59e0b',
  [Mode.CONVERSE]: '#ec4899',
}

// Mode -> screen route mapping
const MODE_ROUTES: Partial<Record<Mode, string>> = {
  [Mode.FOCUS]: '/focus',
  [Mode.GUIDE]: '/guide',
  [Mode.CAPTURE]: '/capture',
  [Mode.CONVERSE]: '/converse',
}

export default function HomeScreen() {
  const router = useRouter()
  const { state, switchMode, wake, processCommand } = useOrbitEngine()
  const [commandInput, setCommandInput] = useState('')
  const [commandLog, setCommandLog] = useState<{ text: string; result: string; success: boolean }[]>([])

  const handleCommand = () => {
    if (!commandInput.trim()) return
    const result = processCommand(commandInput.trim())
    setCommandLog((prev) => [...prev.slice(-19), { text: commandInput, result: result.message, success: result.success }])
    setCommandInput('')
  }

  const modeColor = MODE_COLORS[state.mode] ?? '#3b82f6'
  const loc = state.sensors.location

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.dot, { backgroundColor: modeColor }]} />
          <Text style={styles.title}>Orbit</Text>
          <Text style={styles.subtitle}>GEN 1</Text>
        </View>
        <Text style={styles.statusText}>{state.statusLine}</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Mode card */}
        <View style={[styles.card, { borderColor: modeColor + '40' }]}>
          <View style={styles.modeRow}>
            <Text style={styles.modeIcon}>{MODE_ICONS[state.mode]}</Text>
            <View>
              <Text style={[styles.modeLabel, { color: modeColor }]}>
                {state.mode.toUpperCase()}
              </Text>
              <Text style={styles.motionState}>
                {state.sensors.motion_state} · {state.context.time_of_day}
              </Text>
            </View>
          </View>
          <Text style={styles.explanation}>{state.explanation}</Text>
        </View>

        {/* Sensor data */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SENSORS</Text>
          <View style={styles.sensorGrid}>
            <SensorStat label="LAT" value={loc ? loc.lat.toFixed(4) : '---'} />
            <SensorStat label="LNG" value={loc ? loc.lng.toFixed(4) : '---'} />
            <SensorStat label="ALT" value={loc ? `${loc.alt.toFixed(0)}m` : '---'} />
            <SensorStat label="HDG" value={`${state.sensors.heading_deg.toFixed(0)}°`} />
            <SensorStat label="SPEED" value={`${state.sensors.speed_kmh.toFixed(1)} km/h`} />
            <SensorStat label="BAT" value={`${state.sensors.battery_pct.toFixed(0)}%`} warn={state.sensors.battery_pct < 20} />
          </View>
        </View>

        {/* Mode switcher */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>MODES</Text>
          {state.mode === Mode.SLEEP ? (
            <TouchableOpacity style={[styles.wakeBtn, { backgroundColor: '#3b82f6' }]} onPress={wake}>
              <Text style={styles.wakeBtnText}>Wake Up Orbit</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.modeGrid}>
              {state.availableModes.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.modeBtn,
                    state.mode === m && { backgroundColor: (MODE_COLORS[m] ?? '#3b82f6') + '30', borderColor: MODE_COLORS[m] },
                  ]}
                  onPress={() => {
                    switchMode(m)
                    const route = MODE_ROUTES[m]
                    if (route) router.push(route as any)
                  }}
                >
                  <Text style={styles.modeBtnIcon}>{MODE_ICONS[m]}</Text>
                  <Text style={[styles.modeBtnLabel, state.mode === m && { color: MODE_COLORS[m] }]}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Command input */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>COMMANDS</Text>
          {commandLog.length === 0 && (
            <Text style={styles.hint}>Try: focus, guide me to the park, remember this, sleep</Text>
          )}
          {commandLog.map((entry, i) => (
            <View key={i} style={styles.logEntry}>
              <Text style={styles.logCommand}>{'> '}{entry.text}</Text>
              <Text style={[styles.logResult, { color: entry.success ? '#10b981' : '#ef4444' }]}>
                {entry.result}
              </Text>
            </View>
          ))}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={commandInput}
              onChangeText={setCommandInput}
              onSubmitEditing={handleCommand}
              placeholder="Talk to Orbit..."
              placeholderTextColor="#4b5563"
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleCommand}>
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>ORBIT v0.1.0 — Gen 1 — Phone is Orbit</Text>
      </ScrollView>
    </View>
  )
}

function SensorStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, warn && { color: '#f59e0b' }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17',
    paddingTop: Platform.OS === 'web' ? 20 : 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f293740',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e5e7eb',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 9,
    color: '#6b7280',
    letterSpacing: 2,
  },
  statusText: {
    fontSize: 12,
    color: '#6b7280',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f293780',
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 2,
    marginBottom: 12,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  modeIcon: {
    fontSize: 28,
  },
  modeLabel: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
  },
  motionState: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  explanation: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  stat: {
    width: '31%',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 9,
    color: '#6b7280',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
    minWidth: 80,
  },
  modeBtnIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  modeBtnLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  wakeBtn: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  wakeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  hint: {
    fontSize: 12,
    color: '#4b5563',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  logEntry: {
    marginBottom: 4,
  },
  logCommand: {
    fontSize: 12,
    color: '#3b82f6',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  logResult: {
    fontSize: 12,
    marginLeft: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#0a0e17',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#e5e7eb',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  sendBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    textAlign: 'center',
    fontSize: 10,
    color: '#374151',
    marginTop: 8,
  },
})
