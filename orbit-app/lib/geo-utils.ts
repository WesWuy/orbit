/**
 * Geo utilities — bearing, distance, and coordinate math.
 */

const EARTH_RADIUS_M = 6371000

/** Distance between two lat/lng points in meters (Haversine) */
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Bearing from point 1 to point 2 in degrees (0-360) */
export function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = toRad(lng2 - lng1)
  const y = Math.sin(dLng) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/** Relative bearing: how far left/right is the target from current heading? (-180 to +180) */
export function relativeBearing(heading: number, targetBearing: number): number {
  let diff = targetBearing - heading
  while (diff > 180) diff -= 360
  while (diff < -180) diff += 360
  return diff
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}
