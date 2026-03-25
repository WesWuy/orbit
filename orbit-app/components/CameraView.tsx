/**
 * CameraView — camera preview with graceful fallback.
 *
 * Uses expo-camera on native, shows placeholder on web.
 * Provides a capture button that returns a base64 image.
 */

import { View, Text, StyleSheet, Platform } from 'react-native'
import { useRef, useState, useEffect } from 'react'

let CameraModule: any = null
if (Platform.OS !== 'web') {
  try {
    CameraModule = require('expo-camera')
  } catch {}
}

interface CameraViewProps {
  onCapture?: (base64: string) => void
  modeColor: string
  children?: React.ReactNode
}

export function CameraView({ modeColor, children }: CameraViewProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const cameraRef = useRef<any>(null)

  useEffect(() => {
    if (Platform.OS === 'web' || !CameraModule) return
    (async () => {
      const { status } = await CameraModule.Camera.requestCameraPermissionsAsync()
      setHasPermission(status === 'granted')
    })()
  }, [])

  // Web fallback
  if (Platform.OS === 'web' || !CameraModule) {
    return (
      <View style={[styles.container, styles.placeholder]}>
        <View style={[styles.placeholderInner, { borderColor: modeColor + '30' }]}>
          <Text style={[styles.placeholderIcon, { color: modeColor + '60' }]}>◉</Text>
          <Text style={[styles.placeholderText, { color: modeColor + '50' }]}>Camera on mobile</Text>
          <Text style={styles.placeholderSub}>Open on your phone to use the camera</Text>
        </View>
        {children}
      </View>
    )
  }

  // Permission pending
  if (hasPermission === null) {
    return (
      <View style={[styles.container, styles.placeholder]}>
        <Text style={styles.placeholderText}>Requesting camera access...</Text>
      </View>
    )
  }

  // Permission denied
  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.placeholder]}>
        <Text style={styles.placeholderText}>Camera access denied</Text>
        <Text style={styles.placeholderSub}>Enable in Settings to use Focus mode</Text>
      </View>
    )
  }

  // Real camera
  const { CameraView: ExpoCamera } = CameraModule
  return (
    <View style={styles.container}>
      <ExpoCamera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />
      {children}
    </View>
  )
}

/**
 * Take a photo and return base64.
 */
export async function takePhoto(cameraRef: any): Promise<string | null> {
  if (!cameraRef?.current) return null
  try {
    const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 })
    return photo.base64 ?? null
  } catch {
    return null
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderInner: {
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 20,
    padding: 32,
    borderStyle: 'dashed',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  placeholderText: {
    color: '#ffffff40',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  placeholderSub: {
    color: '#ffffff20',
    fontSize: 11,
  },
})
