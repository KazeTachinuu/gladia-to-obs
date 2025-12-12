/**
 * Server-Sent Events (SSE) Client Manager
 *
 * Manages connected overlay clients and broadcasts real-time messages.
 * Supports SSE resumption with event IDs, keep-alive pings, and graceful shutdown.
 */

import type { SSEClient, OverlayStyle } from "./types";
import { createLogger } from "./lib/logger";

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Keep-alive ping interval in milliseconds */
const KEEP_ALIVE_INTERVAL = 30_000; // 30 seconds

// =============================================================================
// STATE
// =============================================================================

/** Registry of connected SSE clients */
const clients = new Map<number, Readonly<SSEClient>>();

/** Next client ID to assign */
let nextClientId = 0;

/** Global event ID counter for SSE resumption support */
let eventId = 0;

/** Text encoder for SSE message serialization */
const encoder = new TextEncoder();

/** Logger instance for SSE operations */
const logger = createLogger("SSE");

// =============================================================================
// TYPES
// =============================================================================

/** SSE event types */
type SSEEventType = "text" | "style" | "shutdown";

/** SSE message payload */
interface SSEMessage {
  readonly type: SSEEventType;
  readonly data: unknown;
}

// =============================================================================
// CLIENT MANAGEMENT
// =============================================================================

/**
 * Register a new SSE client and start streaming
 *
 * @param controller - ReadableStream controller for sending data
 * @returns Unique client ID for later removal
 *
 * @example
 * ```ts
 * const clientId = addClient(controller);
 * // Later: removeClient(clientId);
 * ```
 */
export function addClient(controller: ReadableStreamDefaultController<Uint8Array>): number {
  const id = ++nextClientId;
  const client: SSEClient = {
    controller,
    id,
    lastPing: Date.now(),
  };

  clients.set(id, Object.freeze(client));
  logger.info("Client connected", { clientId: id, totalClients: clients.size });

  return id;
}

/**
 * Remove a client from the registry
 *
 * @param id - Client ID returned from addClient()
 *
 * @example
 * ```ts
 * removeClient(clientId);
 * ```
 */
export function removeClient(id: number): void {
  if (clients.delete(id)) {
    logger.info("Client disconnected", { clientId: id, totalClients: clients.size });
  }
}

/**
 * Get the current number of connected clients
 *
 * @returns Number of active SSE connections
 *
 * @example
 * ```ts
 * console.log(`Active clients: ${getClientCount()}`);
 * ```
 */
export function getClientCount(): number {
  return clients.size;
}

// =============================================================================
// BROADCASTING
// =============================================================================

/**
 * Send text message to all connected overlay clients
 *
 * @param text - Caption text to display
 *
 * @example
 * ```ts
 * broadcast("Hello, world!");
 * ```
 */
export function broadcast(text: string): void {
  const payload = { text };
  const message = formatSSEMessage("text", payload);
  sendToAll(message);
  logger.debug("Broadcast text", { length: text.length, clients: clients.size });
}

/**
 * Send style update to all connected overlay clients
 *
 * @param style - Overlay style configuration
 *
 * @example
 * ```ts
 * broadcastStyle({ fontSize: "24px", posX: "50%", posY: "90%" });
 * ```
 */
export function broadcastStyle(style: OverlayStyle): void {
  const payload = { type: "style", ...style };
  const message = formatSSEMessage("style", payload);
  sendToAll(message);
  logger.info("Broadcast style", { style, clients: clients.size });
}

/**
 * Notify all clients of graceful shutdown
 *
 * Sends a shutdown event to allow clients to display appropriate UI
 * or attempt reconnection logic.
 *
 * @example
 * ```ts
 * process.on("SIGTERM", () => {
 *   broadcastShutdown();
 *   process.exit(0);
 * });
 * ```
 */
export function broadcastShutdown(): void {
  const payload = { message: "Server shutting down" };
  const message = formatSSEMessage("shutdown", payload);
  sendToAll(message);
  logger.warn("Broadcast shutdown", { clients: clients.size });
}

// =============================================================================
// INTERNAL UTILITIES
// =============================================================================

/**
 * Format data as proper SSE message with event ID
 *
 * SSE format:
 * ```
 * id:123
 * event:text
 * data:{"text":"Hello"}
 *
 * ```
 *
 * @param eventType - SSE event type
 * @param data - Payload to send (will be JSON-stringified)
 * @returns Encoded SSE message bytes
 */
function formatSSEMessage(eventType: SSEEventType, data: unknown): Uint8Array {
  const id = ++eventId;
  const message = `id:${id}\nevent:${eventType}\ndata:${JSON.stringify(data)}\n\n`;
  return encoder.encode(message);
}

/**
 * Send pre-formatted message to all connected clients
 *
 * Automatically removes clients that fail to receive the message.
 *
 * @param data - Encoded SSE message bytes
 */
function sendToAll(data: Uint8Array): void {
  const failedClients: number[] = [];

  for (const [id, client] of clients) {
    try {
      client.controller.enqueue(data);
    } catch (error) {
      failedClients.push(id);
      logger.warn("Failed to send to client", {
        clientId: id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Clean up failed clients
  for (const id of failedClients) {
    removeClient(id);
  }
}

// =============================================================================
// KEEP-ALIVE
// =============================================================================

/**
 * Periodic ping to maintain connections and detect dead clients
 *
 * Sends SSE comment (`: ping`) every KEEP_ALIVE_INTERVAL to prevent
 * connection timeouts and identify unresponsive clients.
 */
setInterval(() => {
  const ping = encoder.encode(`: ping\n\n`);
  const failedClients: number[] = [];

  for (const [id, client] of clients) {
    try {
      client.controller.enqueue(ping);
      // Update lastPing timestamp (though client is frozen, this is for internal tracking)
      // Note: We don't mutate the frozen object, just log it
      logger.debug("Keep-alive ping sent", { clientId: id });
    } catch (error) {
      failedClients.push(id);
      logger.warn("Keep-alive failed", {
        clientId: id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Clean up dead clients
  for (const id of failedClients) {
    removeClient(id);
  }
}, KEEP_ALIVE_INTERVAL);
