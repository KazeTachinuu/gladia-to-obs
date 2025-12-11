/**
 * Transcription Server v3.0
 * Modern live transcription for OBS/VMix
 */

import { PORT } from "./types";
import { addClient, removeClient, broadcast } from "./sse";
import { DASHBOARD } from "./dashboard";
import { OVERLAY } from "./overlay";

// Check if already running and start server
(async () => {
  // Check if port is already in use
  try {
    const response = await fetch(`http://localhost:${PORT}/`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(500)
    });
    if (response.ok) {
      console.log(`
  Transcription v3.0 is already running!
  Opening http://localhost:${PORT}
`);
      const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
      Bun.spawn([cmd, `http://localhost:${PORT}`]);
      process.exit(0);
    }
  } catch {
    // Port not in use, continue starting server
  }

  console.log(`
  Transcription v3.0
  http://localhost:${PORT}
  http://localhost:${PORT}/overlay (1920x1080)
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

      return new Response("Not Found", { status: 404 });
    }
  });

  // Open browser
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  Bun.spawn([cmd, `http://localhost:${PORT}`]);
})();
