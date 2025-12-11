export interface SSEClient {
  controller: ReadableStreamDefaultController<Uint8Array>;
  id: number;
  lastPing: number;
}

export const PORT = 8080;
