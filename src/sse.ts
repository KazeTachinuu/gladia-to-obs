import type { SSEClient } from "./types";

const clients: Map<number, SSEClient> = new Map();
let nextClientId = 0;

const encoder = new TextEncoder();
const KEEP_ALIVE_INTERVAL = 30_000;

export function addClient(controller: ReadableStreamDefaultController<Uint8Array>): number {
  const id = ++nextClientId;
  clients.set(id, { controller, id, lastPing: Date.now() });
  console.log(`[SSE] +${id} (${clients.size} clients)`);
  return id;
}

export function removeClient(id: number): void {
  if (clients.delete(id)) {
    console.log(`[SSE] -${id} (${clients.size} clients)`);
  }
}

export function broadcast(text: string): void {
  const data = encoder.encode(`data:${JSON.stringify({ text })}\n\n`);
  for (const [id, client] of clients) {
    try {
      client.controller.enqueue(data);
    } catch {
      removeClient(id);
    }
  }
}

// Keep-alive ping
setInterval(() => {
  const ping = encoder.encode(`: ping\n\n`);
  for (const [id, client] of clients) {
    try {
      client.controller.enqueue(ping);
      client.lastPing = Date.now();
    } catch {
      removeClient(id);
    }
  }
}, KEEP_ALIVE_INTERVAL);
