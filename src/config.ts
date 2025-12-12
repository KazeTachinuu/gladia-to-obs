/**
 * Application Configuration
 *
 * Static configuration values that don't change based on environment.
 * For environment-dependent values, see env.ts
 */

/** Application version (semver) */
export const VERSION = "3.6.4";

/** Application name */
export const APP_NAME = "transcription";

/** GitHub repository for auto-updates */
export const GITHUB_OWNER = "hugoMusic";
export const GITHUB_REPO = "transcription";

/** Gladia API configuration */
export const GLADIA_API_URL = "https://api.gladia.io/v2/live";

/** SSE configuration */
export const SSE_KEEP_ALIVE_INTERVAL = 30_000; // 30 seconds
export const SSE_MAX_CLIENTS = 100;

/** WebSocket configuration */
export const WS_RECONNECT_MAX_ATTEMPTS = 5;
export const WS_RECONNECT_BASE_DELAY = 1_000; // 1 second

/** Audio configuration */
export const AUDIO_SAMPLE_RATE = 16_000;
export const AUDIO_BIT_DEPTH = 16;
export const AUDIO_CHANNELS = 1;
