import { networkInterfaces } from "node:os";
import { cors } from "@elysiajs/cors";
import { Elysia, sse } from "elysia";
import { CORS_ORIGIN, PORT, VERSION } from "./config";
import { getDashboardAsset } from "./dashboard-assets";
import { cliArgs, showHelp } from "./lib/cli";
import { createLogger } from "./lib/logger";
import { broadcast, broadcastStyle, getClientCount, sseManager } from "./lib/sse";
import { broadcastSchema, styleSchema } from "./lib/validators";
import { OVERLAY } from "./overlay";
import { checkForUpdate } from "./updater";

if (cliArgs.help) showHelp();

const log = createLogger("server");

process.on("uncaughtException", (err) => {
  log.fatal("Uncaught exception", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  log.fatal("Unhandled rejection", err);
  process.exit(1);
});

const app = new Elysia()
  .use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(","), credentials: true }))

  .get("/", ({ set }) => {
    const asset = getDashboardAsset("/");
    if (!asset) {
      set.status = 404;
      return "Not found";
    }
    return new Response(asset.content, { headers: { "Content-Type": asset.mime } });
  })

  .get("/_app/*", ({ params, set }) => {
    const asset = getDashboardAsset(`/_app/${params["*"]}`);
    if (!asset) {
      set.status = 404;
      return "Not found";
    }
    return new Response(asset.content, {
      headers: {
        "Content-Type": asset.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  })

  .get(
    "/overlay",
    () => new Response(OVERLAY, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  )
  .get("/favicon.ico", ({ set }) => {
    set.status = 204;
    return null;
  })
  .get("/health", () => ({
    status: "ok",
    version: VERSION,
    clients: getClientCount(),
    uptime: process.uptime(),
  }))

  .get("/network-ip", () => {
    for (const nets of Object.values(networkInterfaces()))
      for (const net of nets ?? [])
        if (!net.internal && net.family === "IPv4") return { ip: net.address };
    return { ip: null };
  })

  .get("/stream", async function* () {
    for await (const msg of sseManager.subscribe()) yield sse({ event: msg.event, data: msg.data });
  })

  .post("/broadcast", ({ body }) => {
    const result = broadcastSchema.safeParse(body);
    if (!result.success) return { success: false, error: result.error.flatten().fieldErrors };
    broadcast(result.data.text);
    return { success: true };
  })

  .post("/style", ({ body }) => {
    const result = styleSchema.safeParse(body);
    if (!result.success) return { success: false, error: result.error.flatten().fieldErrors };
    broadcastStyle(result.data);
    return { success: true };
  });

async function main() {
  // Check if already running
  try {
    const res = await fetch(`http://localhost:${PORT}/health`, {
      signal: AbortSignal.timeout(500),
    });
    if (res.ok) {
      console.log(
        `\n  \x1b[1mTranscription\x1b[0m \x1b[2mv${VERSION}\x1b[0m\n\n  \x1b[33m●\x1b[0m Already running at http://localhost:${PORT}\n`
      );
      if (!cliArgs["no-browser"]) openBrowser();
      process.exit(0);
    }
  } catch {}

  app.listen(PORT);

  const browserOpened = !cliArgs["no-browser"];
  if (browserOpened) openBrowser();

  console.clear();
  console.log(
    `\n  \x1b[1mTranscription\x1b[0m \x1b[2mv${VERSION}\x1b[0m\n\n  \x1b[32m●\x1b[0m http://localhost:${PORT}\n  ${browserOpened ? "\x1b[2mBrowser opened\x1b[0m" : "\x1b[2mOpen in browser to start\x1b[0m"}\n\n  \x1b[2mOBS overlay:\x1b[0m http://localhost:${PORT}/overlay\n`
  );

  checkForUpdate();
  setInterval(() => sseManager.ping(), 30_000);

  const shutdown = () => {
    sseManager.shutdown();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function openBrowser() {
  const url = `http://localhost:${PORT}`;
  try {
    if (process.platform === "win32") Bun.spawn(["cmd", "/c", "start", "", url]);
    else if (process.platform === "darwin") Bun.spawn(["open", url]);
    else
      for (const cmd of ["xdg-open", "sensible-browser"]) {
        try {
          if (Bun.spawn([cmd, url], { stderr: "pipe" }).pid) break;
        } catch {}
      }
  } catch {}
}

main().catch((err) => {
  log.fatal("Startup error", err);
  process.exit(1);
});
