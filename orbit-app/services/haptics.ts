/**
 * Haptics — tactile feedback for Orbit.
 *
 * Light taps on button press, medium impact on mode switch,
 * notification feedback on Merope reply.
 * Only runs on native (iOS/Android). No-ops on web.
 */

import { Platform } from 'react-native'

let Haptics: typeof import('expo-haptics') | null = null

// Lazy load expo-haptics only on native
if (Platform.OS !== 'web') {
  try {
    Haptics = require('expo-haptics')
  } catch {}
}

export function tapLight() {
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light)
}

export function tapMedium() {
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
}

export function tapHeavy() {
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
}

export function notifySuccess() {
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success)
}

export function notifyWarning() {
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Warning)
}

export function notifyError() {
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Error)
}

export function selectionTick() {
  Haptics?.selectionAsync()
}
