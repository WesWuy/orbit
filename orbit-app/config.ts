/**
 * Orbit App Configuration.
 *
 * To enable Mistral AI (make Merope real):
 * 1. Get an API key from https://console.mistral.ai
 * 2. Paste it below as mistralApiKey
 * 3. Restart the app — Merope will think for real!
 *
 * Leave mistralApiKey as empty string to use mock AI (offline dev).
 */

export const AI_CONFIG = {
  /** Mistral API key — empty string = mock mode */
  mistralApiKey: 'hGQ8wNUEQ9TMJqHOT9CON8OptTMpmU3C',

  /** Chat model — 'mistral-small-latest' is cheapest, 'mistral-large-latest' is smartest */
  mistralChatModel: 'mistral-small-latest',

  /** Vision model — 'pixtral-12b-2409' for image analysis in Focus mode */
  mistralVisionModel: 'pixtral-12b-2409',
}
