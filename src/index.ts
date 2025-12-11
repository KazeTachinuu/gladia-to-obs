/**
 * Transcription Server v3.0
 * Modern live transcription for OBS/VMix
 */

import { PORT, VERSION } from "./types";
import { addClient, removeClient, broadcast, broadcastStyle } from "./sse";
import { DASHBOARD } from "./dashboard";
import { OVERLAY } from "./overlay";
import { autoUpdate } from "./updater";

// Check if already running and start server
(async () => {
  // Auto-update check (runs silently, updates if newer version available)
  await autoUpdate();

  // Check if port is already in use
  try {
    const response = await fetch(`http://localhost:${PORT}/`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(500)
    });
    if (response.ok) {
      console.clear();
      console.log(`
\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════════════════════╗\x1b[0m
\x1b[1m\x1b[36m║\x1b[0m                                                                              \x1b[1m\x1b[36m║\x1b[0m
\x1b[1m\x1b[36m║\x1b[0m   \x1b[1m\x1b[35mTRANSCRIPTION v${VERSION}\x1b[0m                                                        \x1b[1m\x1b[36m║\x1b[0m
\x1b[1m\x1b[36m║\x1b[0m   \x1b[2mLive captions for OBS / VMix\x1b[0m                                              \x1b[1m\x1b[36m║\x1b[0m
\x1b[1m\x1b[36m║\x1b[0m                                                                              \x1b[1m\x1b[36m║\x1b[0m
\x1b[1m\x1b[36m╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m

\x1b[1m\x1b[33m[INFO]\x1b[0m Server is already running.

   \x1b[36m>\x1b[0m  Opening configuration page...
      \x1b[4m\x1b[36mhttp://localhost:${PORT}\x1b[0m
`);
      const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
      Bun.spawn([cmd, `http://localhost:${PORT}`]);
      process.exit(0);
    }
  } catch {
    // Port not in use, continue starting server
  }

  // Clear screen for clean display
  console.clear();

  console.log(`
\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║\x1b[0m   \x1b[1m\x1b[35mTRANSCRIPTION v${VERSION}\x1b[0m                                                        \x1b[1m\x1b[36m║
║\x1b[0m   \x1b[2mLive captions for OBS / VMix\x1b[0m                                              \x1b[1m\x1b[36m║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m

\x1b[1m\x1b[32m[OK]\x1b[0m Server is now running.

\x1b[1m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m
\x1b[1mSTEP 1: CONFIGURATION\x1b[0m
\x1b[1m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m

   A web page has opened automatically in your browser.

   \x1b[36m>\x1b[0m  If it didn't open, click this link:
      \x1b[4m\x1b[36mhttp://localhost:${PORT}\x1b[0m

   \x1b[36m>\x1b[0m  On this page:
      \x1b[32m1.\x1b[0m Paste your Gladia API key (free at \x1b[4mgladia.io\x1b[0m)
      \x1b[32m2.\x1b[0m Select your language
      \x1b[32m3.\x1b[0m Click the \x1b[1m\x1b[32m"Start"\x1b[0m button

\x1b[1m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m
\x1b[1mSTEP 2: ADD TO OBS / VMIX\x1b[0m
\x1b[1m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m

   In OBS, add a \x1b[1m"Browser Source"\x1b[0m with these settings:

   \x1b[36m>\x1b[0m  URL to copy:
      \x1b[4m\x1b[36mhttp://localhost:${PORT}/overlay\x1b[0m

   \x1b[36m>\x1b[0m  Dimensions:
      Width: \x1b[1m1920\x1b[0m  |  Height: \x1b[1m1080\x1b[0m

\x1b[1m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m
\x1b[1mTO STOP THE SERVER\x1b[0m
\x1b[1m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m

   Press \x1b[1m\x1b[31mCTRL + C\x1b[0m in this window to stop the server.

\x1b[2m──────────────────────────────────────────────────────────────────────────────────\x1b[0m
\x1b[2m   Waiting for connections... (keep this window open)\x1b[0m
`);

  Bun.serve({
    port: PORT,
    idleTimeout: 255,

    fetch(req: Request): Response | Promise<Response> {
      const { pathname } = new URL(req.url);

      // Dashboard
      if (pathname === "/" || pathname === "/index.html") {
        return new Response(DASHBOARD, {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      // Overlay
      if (pathname === "/overlay") {
        return new Response(OVERLAY, {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      // SSE Stream
      if (pathname === "/stream") {
        let id: number;
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            id = addClient(controller);
          },
          cancel() {
            removeClient(id);
          }
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }

      // Broadcast endpoint
      if (pathname === "/broadcast" && req.method === "POST") {
        return req.json().then(({ text }: { text: string }) => {
          if (text) broadcast(text);
          return new Response("ok", { status: 200 });
        }).catch(() => new Response("error", { status: 400 }));
      }

      // Style endpoint
      if (pathname === "/style" && req.method === "POST") {
        return req.json().then((style: { fontSize: string; textAlign: string; bgStyle: string }) => {
          broadcastStyle(style);
          return new Response("ok", { status: 200 });
        }).catch(() => new Response("error", { status: 400 }));
      }

      return new Response("Not Found", { status: 404 });
    }
  });

  // Open browser
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  Bun.spawn([cmd, `http://localhost:${PORT}`]);
})();
