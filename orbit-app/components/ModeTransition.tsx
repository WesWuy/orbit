/**
 * ModeTransition — animated overlay for mode switches.
 *
 * Shows a brief color wash + Merope's transition message
 * when switching between modes. Fades in and out quickly.
 */

import { View, Text, StyleSheet, Animated, Easing } from 'react-native'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Mode } from '../engine/mode-manager'
import { MODE_EXPERTISE, getMeropeTransitionMessage } from '../engine/merope'

interface ModeTransitionProps {
  fromMode: Mode | null
  toMode: Mode
  onComplete?: () => void
}

export function ModeTransition({ fromMode, toMode, onComplete }: ModeTransitionProps) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const opacity = useRef(new Animated.Value(0)).current
  const prevMode = useRef(toMode)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (prevMode.current === toMode) return
    const from = prevMode.current
    prevMode.current = toMode

    const msg = getMeropeTransitionMessage(from, toMode)
    setMessage(msg)
    setVisible(true)

    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.delay(800),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start(() => {
      setVisible(false)
      onCompleteRef.current?.()
    })
  }, [toMode, opacity])

  if (!visible) return null

  const color = MODE_EXPERTISE[toMode].color
  const icon = MODE_EXPERTISE[toMode].icon

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity,
          backgroundColor: color + '15',
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.message, { color }]}>{message}</Text>
        <View style={[styles.line, { backgroundColor: color + '40' }]} />
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
  },
  icon: {
    fontSize: 32,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
    maxWidth: 280,
  },
  line: {
    width: 40,
    height: 2,
    borderRadius: 1,
    marginTop: 4,
  },
})
