export const VERSION = "3.7.2";
export const GITHUB_OWNER = "KazeTachinuu";
export const GITHUB_REPO = "gladia-to-obs";
// biome-ignore lint/complexity/useLiteralKeys: process.env requires bracket notation for TS
export const PORT = Number(process.env["PORT"]) || 8080;
// biome-ignore lint/complexity/useLiteralKeys: process.env requires bracket notation for TS
export const CORS_ORIGIN = process.env["CORS_ORIGIN"] || "*";
export const SSE_MAX_CLIENTS = 100;
