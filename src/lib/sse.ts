/**
 * Server-Sent Events (SSE) Manager
 *
 * Clean pub/sub pattern using EventEmitter for broadcasting.
 */

import { EventEmitter } from "node:events";
import { SSE_MAX_CLIENTS } from "../config";
import type { StylePayload } from "./validators";

// =============================================================================
// TYPES
// =============================================================================

interface SSEMessage {
  event: string;
  data: unknown;
}

// =============================================================================
// SSE MANAGER
// =============================================================================

class SSEManager extends EventEmitter {
  private clientCount = 0;

  constructor() {
    super();
    this.setMaxListeners(SSE_MAX_CLIENTS + 10);
  }

  /**
   * Create an async iterator for a client connection
   */
  async *subscribe(): AsyncGenerator<SSEMessage> {
    if (this.clientCount >= SSE_MAX_CLIENTS) {
      throw new Error("Max clients reached");
    }

    this.clientCount++;
    const queue: SSEMessage[] = [];
    let resolve: (() => void) | null = null;

    const handler = (msg: SSEMessage) => {
      queue.push(msg);
      resolve?.();
    };

    this.on("message", handler);

    try {
      while (true) {
        if (queue.length === 0) {
          await new Promise<void>((r) => {
            resolve = r;
          });
          resolve = null;
        }

        while (queue.length > 0) {
          yield queue.shift()!;
        }
      }
    } finally {
      this.clientCount--;
      this.off("message", handler);
    }
  }

  /**
   * Get current client count
   */
  getClientCount(): number {
    return this.clientCount;
  }

  /**
   * Broadcast text to all clients
   */
  broadcastText(text: string): void {
    this.emit("message", { event: "text", data: { text } });
  }

  /**
   * Broadcast style update to all clients
   */
  broadcastStyle(style: StylePayload): void {
    this.emit("message", { event: "style", data: style });
  }

  /**
   * Send ping to all clients (for SSE, this is handled differently)
   */
  ping(): void {
    this.emit("message", { event: "ping", data: {} });
  }

  /**
   * Notify clients of shutdown
   */
  shutdown(): void {
    this.emit("message", { event: "shutdown", data: { message: "Server shutting down" } });
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

export const sseManager = new SSEManager();

// Convenience exports
export const broadcast = sseManager.broadcastText.bind(sseManager);
export const broadcastStyle = sseManager.broadcastStyle.bind(sseManager);
export const getClientCount = sseManager.getClientCount.bind(sseManager);
