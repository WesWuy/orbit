/**
 * SimView — 2D top-down simulation visualization.
 *
 * Phase 1: Canvas-based 2D view showing drone, target, dock, and geofence.
 * Phase 2+: Three.js 3D view with React Three Fiber.
 */

import { useEffect, useRef } from 'react'
import type { OrbitState } from '../lib/types'

interface Props {
  state: OrbitState
}

const SCALE = 6 // pixels per meter
const GRID_SPACING = 5 // meters

export function SimView({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Size canvas to container
    const rect = canvas.parentElement?.getBoundingClientRect()
    if (rect) {
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    const w = rect?.width ?? 300
    const h = rect?.height ?? 200
    const cx = w / 2
    const cy = h / 2

    // Clear
    ctx.fillStyle = '#0a0e17'
    ctx.fillRect(0, 0, w, h)

    // Grid
    ctx.strokeStyle = '#1a1f2e'
    ctx.lineWidth = 0.5
    for (let x = cx % (GRID_SPACING * SCALE); x < w; x += GRID_SPACING * SCALE) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = cy % (GRID_SPACING * SCALE); y < h; y += GRID_SPACING * SCALE) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    // Geofence circle (100m radius)
    ctx.strokeStyle = '#1f293780'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.arc(cx, cy, 100 * SCALE, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Helper: world to screen
    const toScreen = (wx: number, wy: number): [number, number] => [
      cx + wx * SCALE,
      cy - wy * SCALE, // flip Y
    ]

    // Dock — square
    const [dockX, dockY] = toScreen(0, -8)
    ctx.fillStyle = '#f59e0b40'
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 1.5
    ctx.fillRect(dockX - 6, dockY - 6, 12, 12)
    ctx.strokeRect(dockX - 6, dockY - 6, 12, 12)
    ctx.fillStyle = '#f59e0b'
    ctx.font = '9px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('DOCK', dockX, dockY + 18)

    // Target (person) — filled circle
    if (state.target_locked || state.mode !== 'idle') {
      const angle = (state.sim_time ?? 0) * 0.3
      const tx = 5 * Math.cos(angle)
      const ty = 5 * Math.sin(angle)
      const [tScreenX, tScreenY] = toScreen(tx, ty)

      ctx.fillStyle = '#10b98140'
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(tScreenX, tScreenY, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#10b981'
      ctx.font = '9px Inter, sans-serif'
      ctx.fillText('TARGET', tScreenX, tScreenY + 16)
    }

    // Drone — triangle pointing in heading direction
    const [droneX, droneY] = toScreen(state.position.x, state.position.y)
    const headingRad = (state.heading_deg * Math.PI) / 180

    ctx.save()
    ctx.translate(droneX, droneY)
    ctx.rotate(-headingRad)

    // Altitude glow
    if (state.altitude_m > 0.5) {
      ctx.fillStyle = `rgba(59, 130, 246, ${Math.min(0.3, state.altitude_m / 20)})`
      ctx.beginPath()
      ctx.arc(0, 0, 8 + state.altitude_m, 0, Math.PI * 2)
      ctx.fill()
    }

    // Drone body
    ctx.fillStyle = state.safety_state === 'emergency' ? '#ef4444' : '#3b82f6'
    ctx.strokeStyle = state.safety_state === 'emergency' ? '#ef4444' : '#60a5fa'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(8, 0)
    ctx.lineTo(-5, -5)
    ctx.lineTo(-3, 0)
    ctx.lineTo(-5, 5)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.restore()

    // Drone label
    ctx.fillStyle = '#e5e7eb'
    ctx.font = '9px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('ORBIT', droneX, droneY - 14)
    ctx.fillStyle = '#6b7280'
    ctx.font = '8px JetBrains Mono, monospace'
    ctx.fillText(`z: ${state.altitude_m.toFixed(1)}m`, droneX, droneY + 18)

  }, [state])

  return (
    <div className="orbit-card p-0 overflow-hidden" style={{ height: '240px' }}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
