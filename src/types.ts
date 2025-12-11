export interface SSEClient {
  controller: ReadableStreamDefaultController<Uint8Array>;
  id: number;
  lastPing: number;
}

export const PORT = 8080;

// Single source of truth: package.json
import pkg from "../package.json";
export const VERSION = pkg.version;

// GitHub repo for auto-updates
export const GITHUB_OWNER = "KazeTachinuu";
export const GITHUB_REPO = "gladia-to-obs";
