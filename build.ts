#!/usr/bin/env bun
/**
 * Cross-platform build script for Transcription
 *
 * Usage:
 *   bun run build.ts [target]
 *
 * Targets:
 *   all (default) - Build for all platforms
 *   mac-arm64     - macOS Apple Silicon
 *   mac-x64       - macOS Intel
 *   linux-x64     - Linux x64
 *   linux-arm64   - Linux ARM64
 *   win-x64       - Windows x64
 */

import { mkdir, readdir, rm } from "node:fs/promises";
import { join, relative } from "node:path";

// =============================================================================
// Configuration
// =============================================================================

const TARGETS = {
  "mac-arm64": "bun-darwin-arm64",
  "mac-x64": "bun-darwin-x64",
  "linux-x64": "bun-linux-x64",
  "linux-arm64": "bun-linux-arm64",
  "win-x64": "bun-windows-x64",
} as const;

type Target = keyof typeof TARGETS;

const MIME_TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  json: "application/json",
  svg: "image/svg+xml",
  png: "image/png",
  txt: "text/plain",
};

// =============================================================================
// Utilities
// =============================================================================

async function* walkDir(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(path);
    } else {
      yield path;
    }
  }
}

async function exec(cmd: string[], options?: { cwd?: string; quiet?: boolean }): Promise<void> {
  const proc = Bun.spawn(cmd, {
    cwd: options?.cwd,
    stdout: options?.quiet ? "ignore" : "inherit",
    stderr: options?.quiet ? "ignore" : "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Command failed: ${cmd.join(" ")}`);
  }
}

function log(msg: string) {
  console.log(`\x1b[36m→\x1b[0m ${msg}`);
}

function success(msg: string) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

// =============================================================================
// Build Steps
// =============================================================================

async function clean() {
  log("Cleaning previous build...");
  await rm(".build", { recursive: true, force: true });
  await mkdir(".build", { recursive: true });
  await mkdir("dist", { recursive: true });
}

async function installDeps() {
  log("Installing dependencies...");
  await exec(["bun", "install", "--frozen-lockfile"], { quiet: true });
}

async function buildDashboard() {
  log("Building dashboard...");
  await exec(["bun", "install", "--frozen-lockfile"], { cwd: "dashboard", quiet: true });
  await exec(["bun", "run", "build"], { cwd: "dashboard", quiet: true });
}

async function generateAssets() {
  log("Embedding dashboard assets...");

  const assets: { route: string; mime: string; content: string }[] = [];

  for await (const file of walkDir("dashboard/build")) {
    // Normalize path separators for Windows compatibility
    const route = `/${relative("dashboard/build", file).replace(/\\/g, "/")}`;
    const ext = file.split(".").pop()?.toLowerCase() ?? "";
    const content = (await Bun.file(file).text())
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");

    assets.push({
      route,
      mime: MIME_TYPES[ext] || "application/octet-stream",
      content,
    });
  }

  const code = `// AUTO-GENERATED - DO NOT EDIT
export const DASHBOARD_ASSETS: Record<string, { content: string; mime: string }> = {
${assets.map((a) => `  "${a.route}": { content: \`${a.content}\`, mime: "${a.mime}" },`).join("\n")}
};

export const getDashboardAsset = (path: string) =>
  DASHBOARD_ASSETS[path === "/" ? "/index.html" : path];
`;

  await Bun.write("src/dashboard-assets.ts", code);
  success(`Embedded ${assets.length} assets`);
}

async function bundle(): Promise<string> {
  log("Bundling application...");

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
  const isWindows = target.startsWith("win");
  const ext = isWindows ? ".exe" : "";
  const outfile = `dist/transcription-${target}${ext}`;

  const args = [
    "bun",
    "build",
    "--compile",
    "--minify",
    `--target=${TARGETS[target]}`,
    bundlePath,
    `--outfile=${outfile}`,
  ];

  // Bytecode compilation causes issues on Windows
  if (!isWindows) {
    args.splice(4, 0, "--bytecode");
  }

  await exec(args, { quiet: true });

  success(`Built ${outfile}`);
}

async function generateChecksums() {
  // Only on Unix systems
  if (process.platform === "win32") return;

  log("Generating checksums...");
  const proc = Bun.spawn(["sh", "-c", "cd dist && shasum -a 256 transcription-* > checksums.txt"], {
    stdout: "ignore",
    stderr: "ignore",
  });
  await proc.exited;
}

async function createMacUniversal() {
  // Only on macOS
  if (process.platform !== "darwin") return;

  const hasArm = await Bun.file("dist/transcription-mac-arm64").exists();
  const hasX64 = await Bun.file("dist/transcription-mac-x64").exists();

  if (hasArm && hasX64) {
    log("Creating macOS universal binary...");
    await exec(
      [
        "lipo",
        "-create",
        "dist/transcription-mac-x64",
        "dist/transcription-mac-arm64",
        "-output",
        "dist/transcription-mac-universal",
      ],
      { quiet: true }
    );
    success("Created dist/transcription-mac-universal");
  }
}

async function showResults() {
  console.log("\n\x1b[32m✓ Build complete!\x1b[0m\n");
  const files = await readdir("dist");
  for (const f of files.sort()) {
    const stat = await Bun.file(`dist/${f}`).size;
    const size = (stat / 1024 / 1024).toFixed(1);
    console.log(`  dist/${f} \x1b[2m(${size} MB)\x1b[0m`);
  }
  console.log();
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const arg = process.argv[2] as Target | "all" | undefined;

  // Validate target
  if (arg && arg !== "all" && !TARGETS[arg as Target]) {
    console.error(`Unknown target: ${arg}`);
    console.error(`Valid targets: ${Object.keys(TARGETS).join(", ")}, all`);
    process.exit(1);
  }

  const targets: Target[] = !arg || arg === "all" ? (Object.keys(TARGETS) as Target[]) : [arg];

  console.log("\n\x1b[1mTranscription Build\x1b[0m\n");

  // Build pipeline
  await clean();
  await installDeps();
  await buildDashboard();
  await generateAssets();

  const bundlePath = await bundle();

  // Compile for each target
  for (const target of targets) {
    log(`Compiling for ${target}...`);
    await compile(bundlePath, target);
  }

  // Post-build steps
  if (targets.length > 1) {
    await generateChecksums();
    await createMacUniversal();
  }

  // Cleanup
  await rm(".build", { recursive: true, force: true });

  await showResults();
}

main().catch((e) => {
  console.error("\x1b[31mBuild failed:\x1b[0m", e.message);
  process.exit(1);
});
