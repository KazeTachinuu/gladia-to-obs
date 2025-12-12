/**
 * Transcription Server
 *
 * A lightweight HTTP server that provides:
 * - Dashboard UI for controlling live transcription
 * - Overlay endpoint for OBS/VMix browser sources
 * - SSE streaming for real-time caption updates
 * - REST endpoints for broadcasting text and styles
 */

// =============================================================================
// IMPORTS
// =============================================================================

import { PORT, VERSION } from "./config";
import { logger } from "./lib/logger";
import { html, notFound, success, error as httpError, sse } from "./lib/http";
import { broadcastSchema, styleSchema } from "./lib/validators";
import { addClient, removeClient, broadcast, broadcastStyle } from "./sse";
import { DASHBOARD } from "./dashboard";
import { OVERLAY } from "./overlay";
import { autoUpdate } from "./updater";
import { ensureInPath } from "./setup";
import type { Server } from "bun";

// =============================================================================
// ERROR HANDLERS
// =============================================================================

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled rejection", { error: err });
  process.exit(1);
});

// =============================================================================
// SERVER INSTANCE
// =============================================================================

let server: Server | null = null;

// =============================================================================
// STARTUP
// =============================================================================

(async () => {
  try {
    // Run setup tasks (PATH installation, auto-update)
    await ensureInPath();
    await autoUpdate();

    // Check if server is already running on this port
    const isRunning = await checkIfRunning();
    if (isRunning) {
      showAlreadyRunningMessage();
      openBrowser();
      process.exit(0);
    }

    // Start fresh server
    console.clear();
    showWelcomeMessage();
    startServer();
    openBrowser();
  } catch (err) {
    logger.error("Startup error", { error: err });
    process.exit(1);
  }
})();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if server is already running on the configured port
 * @returns true if server responds to health check, false otherwise
 */
async function checkIfRunning(): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${PORT}/`, {
      method: "HEAD",
      signal: AbortSignal.timeout(500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Display message when server is already running
 */
function showAlreadyRunningMessage(): void {
  console.clear();
  console.log(`
\x1b[1m\x1b[35mTRANSCRIPTION v${VERSION}\x1b[0m
Live captions for OBS / VMix

\x1b[33m[INFO]\x1b[0m Server is already running.
       Opening \x1b[4mhttp://localhost:${PORT}\x1b[0m
`);
}

/**
 * Display welcome message with setup instructions
 */
function showWelcomeMessage(): void {
  console.log(`
\x1b[1m\x1b[35mTRANSCRIPTION v${VERSION}\x1b[0m
Live captions for OBS / VMix

\x1b[32m[OK]\x1b[0m Server running at \x1b[4mhttp://localhost:${PORT}\x1b[0m

\x1b[1mSETUP:\x1b[0m
  1. Paste your Gladia API key
  2. Select language & click Start
  3. In OBS: add Browser Source → \x1b[4mhttp://localhost:${PORT}/overlay\x1b[0m (1920x1080)

Press \x1b[31mCTRL+C\x1b[0m to stop.
`);
}

/**
 * Open dashboard in default browser
 */
function openBrowser(): void {
  const url = `http://localhost:${PORT}`;
  if (process.platform === "win32") {
    Bun.spawn(["cmd", "/c", "start", url]);
  } else {
    const cmd = process.platform === "darwin" ? "open" : "xdg-open";
    Bun.spawn([cmd, url]);
  }
}

// =============================================================================
// SERVER START/STOP
// =============================================================================

/**
 * Start the HTTP server
 */
function startServer(): void {
  server = Bun.serve({
    port: PORT,
    idleTimeout: 255,
    fetch: handleRequest,
  });

  logger.info(`Server listening on port ${PORT}`);
}

/**
 * Stop the HTTP server gracefully
 */
async function stopServer(): Promise<void> {
  if (server) {
    logger.info("Shutting down server...");
    server.stop();
    server = null;
  }
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

/**
 * Main request handler - routes requests to appropriate handlers
 * @param req - Incoming HTTP request
 * @returns HTTP response
 */
function handleRequest(req: Request): Response | Promise<Response> {
  const startTime = Date.now();
  const { pathname } = new URL(req.url);

  // Handle the request
  let response: Response | Promise<Response>;

  // Dashboard (control panel)
  if (pathname === "/" || pathname === "/index.html") {
    response = html(DASHBOARD);
  }
  // Overlay (OBS browser source)
  else if (pathname === "/overlay") {
    response = html(OVERLAY);
  }
  // SSE stream for real-time updates
  else if (pathname === "/stream") {
    response = createSSEStream();
  }
  // POST /broadcast - send text to all connected overlays
  else if (pathname === "/broadcast" && req.method === "POST") {
    response = handleBroadcast(req);
  }
  // POST /style - update overlay styling
  else if (pathname === "/style" && req.method === "POST") {
    response = handleStyle(req);
  }
  // 404 Not Found
  else {
    response = notFound();
  }

  // Log the request after response is ready
  if (response instanceof Promise) {
    return response.then((res) => {
      const duration = Date.now() - startTime;
      logger.info(`${req.method} ${pathname} - ${res.status} (${duration}ms)`);
      return res;
    });
  } else {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${pathname} - ${response.status} (${duration}ms)`);
    return response;
  }
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * Create an SSE stream for real-time overlay updates
 * @returns SSE response with event stream
 */
function createSSEStream(): Response {
  let clientId: number;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      clientId = addClient(controller);
    },
    cancel() {
      removeClient(clientId);
    },
  });

  return sse(stream);
}

/**
 * Handle POST /broadcast - broadcast text to all connected overlays
 * @param req - HTTP request with JSON body containing text
 * @returns Success or error response
 */
async function handleBroadcast(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const result = broadcastSchema.parse(body);

    if (!result.ok) {
      logger.error("Broadcast validation failed", { error: result.error.message });
      return httpError(result.error.message, 400);
    }

    broadcast(result.value.text);
    return success({ message: "Broadcast sent successfully" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON body";
    logger.error("Broadcast request failed", { error: message });
    return httpError(message, 400);
  }
}

/**
 * Handle POST /style - update overlay styling for all connected overlays
 * @param req - HTTP request with JSON body containing style properties
 * @returns Success or error response
 */
async function handleStyle(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const result = styleSchema.parse(body);

    if (!result.ok) {
      logger.error("Style validation failed", { error: result.error.message });
      return httpError(result.error.message, 400);
    }

    broadcastStyle(result.value);
    return success({ message: "Style updated successfully" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON body";
    logger.error("Style request failed", { error: message });
    return httpError(message, 400);
  }
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

/**
 * Handle graceful shutdown on SIGINT (Ctrl+C) and SIGTERM
 */
async function handleShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  await stopServer();
  process.exit(0);
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
