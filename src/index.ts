/**
 * Transcription Server
 *
 * A high-performance HTTP server using Elysia framework that provides:
 * - Dashboard UI for controlling live transcription
 * - Overlay endpoint for OBS/VMix browser sources
 * - SSE streaming for real-time caption updates
 * - REST endpoints for broadcasting text and styles
 */

import { networkInterfaces } from "node:os";
import { cors } from "@elysiajs/cors";
import { Elysia, sse, t } from "elysia";
import { VERSION } from "./config";
import { getDashboardAsset } from "./dashboard-assets";
import { env } from "./env";
import { cliArgs, showHelp } from "./lib/cli";
import { createLogger } from "./lib/logger";
import {
  broadcast,
  broadcastStyle,
  getClientCount,
  sseManager,
} from "./lib/sse";
import { broadcastSchema, styleSchema } from "./lib/validators";
import { OVERLAY } from "./overlay";
import { ensureInPath } from "./setup";
import { autoUpdate } from "./updater";

// =============================================================================
// CLI ARGUMENTS
// =============================================================================

if (cliArgs.help) {
  showHelp();
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
    // Don't log NOT_FOUND - it's just noise from missing assets
    if (code === "NOT_FOUND") return;
    const message = "message" in error ? error.message : String(error);
    log.error({ code, error: message }, "Request error");
  })

  // ==========================================================================
  // ROUTES
  // ==========================================================================

  // Dashboard (Svelte SPA - serve embedded assets)
  .get("/", ({ set }) => {
    const asset = getDashboardAsset("/");
    if (!asset) {
      set.status = 404;
      return "Not found";
    }
    return new Response(asset.content, { headers: { "Content-Type": asset.mime } });
  })

  // Dashboard assets (/_app/*, etc.)
  .get("/_app/*", ({ params, set }) => {
    const path = "/_app/" + params["*"];
    const asset = getDashboardAsset(path);
    if (!asset) {
      set.status = 404;
      return "Not found";
    }
    // Cache immutable assets for 1 year
    return new Response(asset.content, {
      headers: {
        "Content-Type": asset.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  })

  // Overlay (OBS browser source)
  .get(
    "/overlay",
    () => new Response(OVERLAY, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  )

  // Favicon (empty response to avoid 404 noise)
  .get("/favicon.ico", ({ set }) => {
    set.status = 204;
    return null;
  })

  // Health check
  .get("/health", () => ({
    status: "ok",
    version: VERSION,
    clients: getClientCount(),
    uptime: process.uptime(),
  }))

  // Network IP for overlay URL
  .get("/network-ip", () => {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        // Skip internal/loopback and IPv6
        if (!net.internal && net.family === "IPv4") {
          return { ip: net.address };
        }
      }
    }
    return { ip: null };
  })

  // SSE stream for real-time updates
  .get("/stream", async function* () {
    for await (const msg of sseManager.subscribe()) {
      yield sse({ event: msg.event, data: msg.data });
    }
  })

  // POST /broadcast - send text to all connected overlays
  .post("/broadcast", ({ body }) => {
    const result = broadcastSchema.safeParse(body);
    if (!result.success) {
      return { success: false, error: result.error.flatten().fieldErrors };
    }
    broadcast(result.data.text);
    return { success: true };
  })

  // POST /style - update overlay styling
  .post("/style", ({ body }) => {
    const result = styleSchema.safeParse(body);
    if (!result.success) {
      return { success: false, error: result.error.flatten().fieldErrors };
    }
    broadcastStyle(result.data);
    return { success: true };
  });

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
  \x1b[1mTranscription\x1b[0m \x1b[2mv${VERSION}\x1b[0m

  \x1b[32m●\x1b[0m http://localhost:${env.PORT}
  ${browserOpened ? "\x1b[2mBrowser opened\x1b[0m" : "\x1b[2mOpen in browser to start\x1b[0m"}

  \x1b[2mOBS overlay:\x1b[0m http://localhost:${env.PORT}/overlay
`);
}

function showAlreadyRunningMessage(): void {
  console.clear();
  console.log(`
  \x1b[1mTranscription\x1b[0m \x1b[2mv${VERSION}\x1b[0m

  \x1b[33m●\x1b[0m Already running at http://localhost:${env.PORT}
  \x1b[2mOpening browser...\x1b[0m
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
      if (!cliArgs["no-browser"]) {
        openBrowser();
      }
      process.exit(0);
    }

    // Start server
    app.listen(env.PORT);
    log.info({ port: env.PORT, env: env.NODE_ENV }, "Server started");

    // Open browser automatically (unless --no-browser flag)
    const shouldOpenBrowser = !cliArgs["no-browser"];
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
