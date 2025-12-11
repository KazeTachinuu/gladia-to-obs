export interface SSEClient {
  controller: ReadableStreamDefaultController<Uint8Array>;
  id: number;
  lastPing: number;
}

export const PORT = 8080;

// Version - injected at build time, fallback for dev
export const VERSION = process.env.APP_VERSION || "3.3.0";

// GitHub repo for auto-updates
export const GITHUB_OWNER = "KazeTachinuu";
export const GITHUB_REPO = "gladia-to-obs";
