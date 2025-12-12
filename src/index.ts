/**
 * Transcription Server
 *
 * A high-performance HTTP server using Elysia framework that provides:
 * - Dashboard UI for controlling live transcription
 * - Overlay endpoint for OBS/VMix browser sources
 * - SSE streaming for real-time caption updates
 * - REST endpoints for broadcasting text and styles
 */

import { parseArgs } from "node:util";
import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import { VERSION } from "./config";
import { DASHBOARD } from "./dashboard";
import { env } from "./env";
import { createLogger } from "./lib/logger";
import {
  addClient,
  broadcast,
  broadcastStyle,
  getClientCount,
  removeClient,
  sseManager,
} from "./lib/sse";
import { broadcastSchema, styleSchema } from "./lib/validators";
import { OVERLAY } from "./overlay";
import { ensureInPath } from "./setup";
import { autoUpdate } from "./updater";

// =============================================================================
// CLI ARGUMENTS
// =============================================================================

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    "no-browser": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  allowPositionals: false,
  strict: false,
});

if (args.help) {
  console.log(`
Transcription v${VERSION}
Live captions for OBS / VMix

Usage: transcription [options]

Options:
  --no-browser    Don't open browser automatically
  -h, --help      Show this help message
`);
  process.exit(0);
}

// =============================================================================
// SETUP
// =============================================================================

const log = createLogger("server");

// Global error handlers
process.on("uncaughtException", (err) => {
  log.fatal({ err }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  log.fatal({ err }, "Unhandled rejection");
  process.exit(1);
});

// =============================================================================
// SERVER
// =============================================================================

const app = new Elysia()
  // CORS middleware
  .use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
      credentials: true,
    })
  )

  // Request logging
  .onBeforeHandle(({ request }) => {
    log.debug({ method: request.method, url: request.url }, "Request");
  })

  .onAfterHandle(({ request, set }) => {
    log.info(
      { method: request.method, url: new URL(request.url).pathname, status: set.status },
      "Response"
    );
  })

  .onError(({ error, code }) => {
    const message = "message" in error ? error.message : String(error);
    log.error({ code, error: message }, "Request error");
  })

  // ==========================================================================
  // ROUTES
  // ==========================================================================

  // Dashboard (control panel)
  .get(
    "/",
    () => new Response(DASHBOARD, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  )

  // Overlay (OBS browser source)
  .get(
    "/overlay",
    () => new Response(OVERLAY, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  )

  // Health check
  .get("/health", () => ({
    status: "ok",
    version: VERSION,
    clients: getClientCount(),
    uptime: process.uptime(),
  }))

  // SSE stream for real-time updates
  .get("/stream", ({ set }) => {
    let clientId: number;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        try {
          clientId = addClient(controller);
          log.info({ clientId, total: getClientCount() }, "SSE client connected");
        } catch (error) {
          log.error({ error }, "Failed to add SSE client");
          controller.close();
        }
      },
      cancel() {
        if (clientId) {
          removeClient(clientId);
          log.info({ clientId, total: getClientCount() }, "SSE client disconnected");
        }
      },
    });

    set.headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    };

    return stream;
  })

  // POST /broadcast - send text to all connected overlays
  .post(
    "/broadcast",
    ({ body }) => {
      const result = broadcastSchema.safeParse(body);

      if (!result.success) {
        log.warn({ errors: result.error.flatten() }, "Broadcast validation failed");
        return { success: false, error: result.error.flatten().fieldErrors };
      }

      broadcast(result.data.text);
      log.info({ textLength: result.data.text.length }, "Broadcast sent");
      return { success: true };
    },
    {
      body: t.Object({
        text: t.String(),
      }),
    }
  )

  // POST /style - update overlay styling
  .post(
    "/style",
    ({ body }) => {
      const result = styleSchema.safeParse(body);

      if (!result.success) {
        log.warn({ errors: result.error.flatten() }, "Style validation failed");
        return { success: false, error: result.error.flatten().fieldErrors };
      }

      broadcastStyle(result.data);
      log.info({ style: result.data }, "Style updated");
      return { success: true };
    },
    {
      body: t.Object({
        fontSize: t.Optional(t.Union([t.String(), t.Number()])),
        posX: t.Optional(t.Union([t.String(), t.Number()])),
        posY: t.Optional(t.Union([t.String(), t.Number()])),
        bgStyle: t.Optional(t.String()),
      }),
    }
  );

// =============================================================================
// STARTUP
// =============================================================================

async function checkIfRunning(): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${env.PORT}/health`, {
      signal: AbortSignal.timeout(500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function showWelcomeMessage(browserOpened: boolean): void {
  console.clear();
  console.log(`
\x1b[1m\x1b[35m╔══════════════════════════════════════════════════════╗
║           TRANSCRIPTION v${VERSION.padEnd(10)}               ║
║         Live captions for OBS / VMix                 ║
╚══════════════════════════════════════════════════════╝\x1b[0m

\x1b[32m✓\x1b[0m Server running at \x1b[4m\x1b[36mhttp://localhost:${env.PORT}\x1b[0m
${browserOpened ? "\x1b[32m✓\x1b[0m Browser opened automatically" : "\x1b[33m→\x1b[0m Open the URL above in your browser"}

\x1b[1m┌─ QUICK START ─────────────────────────────────────────┐\x1b[0m
│                                                        │
│  1. Paste your Gladia API key in the dashboard         │
│  2. Select your language and click Start               │
│  3. In OBS: Browser Source → \x1b[4mhttp://localhost:${env.PORT}/overlay\x1b[0m │
│     (Recommended: 1920x1080)                           │
│                                                        │
\x1b[1m└────────────────────────────────────────────────────────┘\x1b[0m

\x1b[2mPress CTRL+C to stop the server.\x1b[0m
`);
}

function showAlreadyRunningMessage(): void {
  console.clear();
  console.log(`
\x1b[1m\x1b[35m╔══════════════════════════════════════════════════════╗
║           TRANSCRIPTION v${VERSION.padEnd(10)}               ║
╚══════════════════════════════════════════════════════╝\x1b[0m

\x1b[33m⚡\x1b[0m Server is already running!
\x1b[32m✓\x1b[0m Opening \x1b[4m\x1b[36mhttp://localhost:${env.PORT}\x1b[0m in your browser...
`);
}

function openBrowser(): void {
  const url = `http://localhost:${env.PORT}`;

  try {
    if (process.platform === "win32") {
      // Windows: use start with empty title (required for URLs with special chars)
      Bun.spawn(["cmd", "/c", "start", "", url]);
    } else if (process.platform === "darwin") {
      Bun.spawn(["open", url]);
    } else {
      // Linux: try xdg-open, fall back to common browsers
      const linuxBrowsers = ["xdg-open", "sensible-browser", "x-www-browser", "gnome-open"];
      for (const browser of linuxBrowsers) {
        try {
          const proc = Bun.spawn([browser, url], { stderr: "pipe" });
          // If spawn didn't throw, assume success
          if (proc.pid) break;
        } catch {
          continue;
        }
      }
    }
  } catch {
    // Silent fail - user can manually open the URL
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  try {
    // Run setup tasks
    await ensureInPath();
    await autoUpdate();

    // Check if already running
    if (await checkIfRunning()) {
      showAlreadyRunningMessage();
      if (!args["no-browser"]) {
        openBrowser();
      }
      process.exit(0);
    }

    // Start server
    app.listen(env.PORT);
    log.info({ port: env.PORT, env: env.NODE_ENV }, "Server started");

    // Open browser automatically (unless --no-browser flag)
    const shouldOpenBrowser = !args["no-browser"];
    if (shouldOpenBrowser) {
      openBrowser();
    }

    // Show welcome message
    showWelcomeMessage(shouldOpenBrowser);

    // Keep-alive ping for SSE clients
    setInterval(() => {
      sseManager.ping();
    }, 30_000);

    // Graceful shutdown
    const shutdown = () => {
      log.info("Shutting down...");
      sseManager.shutdown();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    log.fatal({ err }, "Startup error");
    process.exit(1);
  }
}

main();
