#!/usr/bin/env bun
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { $ } from "bun";

const TARGETS = {
  "mac-arm64": "bun-darwin-arm64",
  "mac-x64": "bun-darwin-x64",
  "linux-x64": "bun-linux-x64",
  "linux-arm64": "bun-linux-arm64",
  "win-x64": "bun-windows-x64",
} as const;

type Target = keyof typeof TARGETS;

async function* walkDir(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkDir(path);
    else yield path;
  }
}

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  json: "application/json",
  svg: "image/svg+xml",
  png: "image/png",
  txt: "text/plain",
};

async function buildDashboard() {
  console.log("Building dashboard...");
  await $`cd dashboard && bun install --frozen-lockfile && bun run build`.quiet();
}

async function generateAssets() {
  console.log("Generating embedded assets...");
  const assets: { route: string; mime: string; content: string }[] = [];

  for await (const file of walkDir("dashboard/build")) {
    const route = `/${relative("dashboard/build", file)}`;
    const ext = file.split(".").pop()?.toLowerCase() ?? "";
    const content = (await Bun.file(file).text())
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");
    assets.push({ route, mime: MIME[ext] || "application/octet-stream", content });
  }

  await Bun.write(
    "src/dashboard-assets.ts",
    `// AUTO-GENERATED
export const DASHBOARD_ASSETS: Record<string, { content: string; mime: string }> = {
${assets.map((a) => `  "${a.route}": { content: \`${a.content}\`, mime: "${a.mime}" },`).join("\n")}
};

export const getDashboardAsset = (path: string) => DASHBOARD_ASSETS[path === "/" ? "/index.html" : path];
`
  );
  console.log(`  Generated ${assets.length} assets`);
}

async function bundle() {
  const result = await Bun.build({
    entrypoints: ["src/index.ts"],
    outdir: ".build",
    target: "bun",
    minify: true,
    naming: "[name].[ext]",
  });
  if (!result.success) {
    console.error("Bundle failed:", result.logs);
    process.exit(1);
  }
  return ".build/index.js";
}

async function compile(bundlePath: string, target: Target) {
  const ext = target.startsWith("win") ? ".exe" : "";
  await $`bun build --compile --minify --target=${TARGETS[target]} ${bundlePath} --outfile dist/transcription-${target}${ext}`.quiet();
}

async function main() {
  const arg = process.argv[2] as Target | "all" | undefined;
  const targets: Target[] = !arg || arg === "all" ? (Object.keys(TARGETS) as Target[]) : [arg];

  if (arg && arg !== "all" && !TARGETS[arg as Target]) {
    console.error(`Unknown target: ${arg}\nValid: ${Object.keys(TARGETS).join(", ")}, all`);
    process.exit(1);
  }

  await $`rm -rf .build && mkdir -p .build dist`.quiet();
  await $`bun install --frozen-lockfile`.quiet();
  await buildDashboard();
  await generateAssets();

  console.log("Bundling...");
  const bundlePath = await bundle();

  for (const target of targets) {
    console.log(`Compiling ${target}...`);
    await compile(bundlePath, target);
  }

  if (targets.length > 1) {
    console.log("Generating checksums...");
    await $`cd dist && shasum -a 256 transcription-* > checksums.txt`.quiet();
  }

  if (targets.includes("mac-arm64") && targets.includes("mac-x64")) {
    console.log("Creating macOS universal binary...");
    await $`lipo -create dist/transcription-mac-x64 dist/transcription-mac-arm64 -output dist/transcription-mac-universal`.quiet();
  }

  await $`rm -rf .build`.quiet();
  console.log("\nDone!");
  await $`ls -lh dist/`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
