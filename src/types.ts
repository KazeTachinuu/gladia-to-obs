/**
 * Shared Type Definitions
 */

// =============================================================================
// SSE TYPES
// =============================================================================

/**
 * Connected SSE client for overlay streaming.
 * Represents an active Server-Sent Events connection to an overlay client.
 */
export interface SSEClient {
  /** Stream controller for sending data to the client */
  readonly controller: ReadableStreamDefaultController<Uint8Array>;
  /** Unique identifier for this client connection */
  readonly id: number;
  /** Timestamp of the last ping sent to this client */
  readonly lastPing: number;
}

// =============================================================================
// OVERLAY TYPES
// =============================================================================

/**
 * Style configuration for the overlay display.
 * Controls the visual appearance and positioning of the overlay text.
 */
export interface OverlayStyle {
  /** Font size (e.g., "24px", "2rem") */
  fontSize?: string;
  /** Horizontal position (e.g., "10px", "50%") */
  posX?: string;
  /** Vertical position (e.g., "10px", "50%") */
  posY?: string;
  /** Background style for the overlay */
  bgStyle?: "none" | "box";
}

// =============================================================================
// API PAYLOAD TYPES
// =============================================================================

/**
 * Payload for broadcasting text to connected overlay clients.
 */
export interface BroadcastPayload {
  /** The text content to broadcast */
  text: string;
}

/**
 * Payload for updating overlay style configuration.
 */
export interface StylePayload extends OverlayStyle {}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Generic API response type with success/error handling.
 * @template T The type of data returned on success
 */
export type ApiResponse<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// =============================================================================
// SERVER STATE TYPES
// =============================================================================

/**
 * Server runtime state information.
 * Tracks whether the server is running and when it started.
 */
export interface ServerState {
  /** Whether the server is currently running */
  running: boolean;
  /** Timestamp when the server started, or null if not running */
  startTime: Date | null;
}

// =============================================================================
// CONSTANTS (re-exported from config for backward compatibility)
// =============================================================================

export { PORT, VERSION, GITHUB_OWNER, GITHUB_REPO } from "./config";
