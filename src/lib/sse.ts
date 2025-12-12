/**
 * Server-Sent Events (SSE) Client Manager
 *
 * Thread-safe client registry with proper cleanup.
 * Uses class-based design for better testability.
 */

import { SSE_MAX_CLIENTS } from "../config";
import { createLogger } from "./logger";
import type { StylePayload } from "./validators";

const log = createLogger("sse");

// =============================================================================
// TYPES
// =============================================================================

export interface SSEClient {
  id: number;
  controller: ReadableStreamDefaultController<Uint8Array>;
  connectedAt: Date;
}

interface SSEMessage {
  type: "text" | "style" | "ping" | "shutdown";
  data: unknown;
}

// =============================================================================
// SSE MANAGER CLASS
// =============================================================================

class SSEManager {
  private clients = new Map<number, SSEClient>();
  private nextId = 0;
  private encoder = new TextEncoder();

  /**
   * Add a new SSE client
   */
  addClient(controller: ReadableStreamDefaultController<Uint8Array>): number {
    if (this.clients.size >= SSE_MAX_CLIENTS) {
      log.warn(
        { current: this.clients.size, max: SSE_MAX_CLIENTS },
        "Max clients reached, rejecting new connection"
      );
      throw new Error("Max clients reached");
    }

    const id = ++this.nextId;
    const client: SSEClient = {
      id,
      controller,
      connectedAt: new Date(),
    };

    this.clients.set(id, client);
    log.info({ clientId: id, total: this.clients.size }, "Client connected");

    return id;
  }

  /**
   * Remove a client
   */
  removeClient(id: number): boolean {
    const removed = this.clients.delete(id);
    if (removed) {
      log.info({ clientId: id, total: this.clients.size }, "Client disconnected");
    }
    return removed;
  }

  /**
   * Get current client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Broadcast text to all clients
   */
  broadcastText(text: string): void {
    this.broadcast({ type: "text", data: { text } });
    log.debug({ length: text.length, clients: this.clients.size }, "Broadcast text");
  }

  /**
   * Broadcast style update to all clients
   */
  broadcastStyle(style: StylePayload): void {
    this.broadcast({ type: "style", data: { type: "style", ...style } });
    log.info({ style, clients: this.clients.size }, "Broadcast style");
  }

  /**
   * Send ping to all clients (keep-alive)
   */
  ping(): void {
    const data = this.encoder.encode(": ping\n\n");
    this.sendRaw(data);
  }

  /**
   * Notify clients of shutdown
   */
  shutdown(): void {
    this.broadcast({ type: "shutdown", data: { message: "Server shutting down" } });
    log.warn({ clients: this.clients.size }, "Broadcast shutdown");
  }

  /**
   * Internal: Format and broadcast SSE message
   */
  private broadcast(message: SSEMessage): void {
    const formatted = this.formatMessage(message);
    this.sendRaw(formatted);
  }

  /**
   * Internal: Send raw data to all clients
   */
  private sendRaw(data: Uint8Array): void {
    const failed: number[] = [];

    for (const [id, client] of this.clients) {
      try {
        client.controller.enqueue(data);
      } catch (error) {
        failed.push(id);
        log.warn(
          { clientId: id, error: error instanceof Error ? error.message : String(error) },
          "Failed to send to client"
        );
      }
    }

    // Clean up failed clients
    for (const id of failed) {
      this.removeClient(id);
    }
  }

  /**
   * Internal: Format message as SSE
   */
  private formatMessage(message: SSEMessage): Uint8Array {
    const eventId = Date.now();
    const sseData = `id:${eventId}\nevent:${message.type}\ndata:${JSON.stringify(message.data)}\n\n`;
    return this.encoder.encode(sseData);
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const sseManager = new SSEManager();

// Export convenience functions
export const addClient = sseManager.addClient.bind(sseManager);
export const removeClient = sseManager.removeClient.bind(sseManager);
export const getClientCount = sseManager.getClientCount.bind(sseManager);
export const broadcast = sseManager.broadcastText.bind(sseManager);
export const broadcastStyle = sseManager.broadcastStyle.bind(sseManager);
