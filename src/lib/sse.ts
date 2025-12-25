import { EventEmitter } from "node:events";
import { SSE_MAX_CLIENTS } from "../config";
import type { StylePayload } from "./validators";

interface SSEMessage {
  event: string;
  data: unknown;
}

export class SSEManager extends EventEmitter {
  private clientCount = 0;

  constructor() {
    super();
    this.setMaxListeners(SSE_MAX_CLIENTS + 10);
  }

  async *subscribe(): AsyncGenerator<SSEMessage> {
    if (this.clientCount >= SSE_MAX_CLIENTS) throw new Error("Max clients reached");

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
        let msg = queue.shift();
        while (msg) {
          yield msg;
          msg = queue.shift();
        }
      }
    } finally {
      this.clientCount--;
      this.off("message", handler);
    }
  }

  getClientCount = () => this.clientCount;
  broadcastText = (text: string) => this.emit("message", { event: "text", data: { text } });
  broadcastStyle = (style: StylePayload) => this.emit("message", { event: "style", data: style });
  ping = () => this.emit("message", { event: "ping", data: {} });
  shutdown = () => this.emit("message", { event: "shutdown", data: {} });
}

export const sseManager = new SSEManager();
export const broadcast = sseManager.broadcastText;
export const broadcastStyle = sseManager.broadcastStyle;
export const getClientCount = sseManager.getClientCount;
