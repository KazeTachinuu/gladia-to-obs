/**
 * Transcription Server
 * Modern live transcription for OBS/VMix
 */

import { PORT, VERSION } from "./types";
import { addClient, removeClient, broadcast, broadcastStyle } from "./sse";
import { DASHBOARD } from "./dashboard";
import { OVERLAY } from "./overlay";
import { autoUpdate } from "./updater";
import { ensureInPath } from "./setup";

// Check if already running and start server
(async () => {
  // Setup: ensure in PATH, check for updates
  await ensureInPath();
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
\x1b[1m\x1b[35mTRANSCRIPTION v${VERSION}\x1b[0m
Live captions for OBS / VMix

\x1b[33m[INFO]\x1b[0m Server is already running.
       Opening \x1b[4mhttp://localhost:${PORT}\x1b[0m
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
\x1b[1m\x1b[35mTRANSCRIPTION v${VERSION}\x1b[0m
Live captions for OBS / VMix

\x1b[32m[OK]\x1b[0m Server running at \x1b[4mhttp://localhost:${PORT}\x1b[0m

\x1b[1mSETUP:\x1b[0m
  1. Paste your Gladia API key
  2. Select language & click Start
  3. In OBS: add Browser Source → \x1b[4mhttp://localhost:${PORT}/overlay\x1b[0m (1920x1080)

Press \x1b[31mCTRL+C\x1b[0m to stop.
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
