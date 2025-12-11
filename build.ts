#!/usr/bin/env bun
/**
 * Atomic idempotent build script
 * Bundles src/ -> .build/bundle.js -> dist/transcription-*
 */

import { $ } from "bun";

const TARGETS = {
  "mac-arm64": "bun-darwin-arm64",
  "mac-x64": "bun-darwin-x64",
  "linux-x64": "bun-linux-x64",
  "linux-arm64": "bun-linux-arm64",
  "win-x64": "bun-windows-x64-baseline", // Use baseline for broader CPU compatibility
} as const;

type Target = keyof typeof TARGETS;

async function bundle(): Promise<string> {
  const outfile = ".build/index.js";

  // Bundle all modules into single file
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

  // Verify bundle exists
  const file = Bun.file(outfile);
  if (!await file.exists()) {
    console.error("Bundle not created at", outfile);
    process.exit(1);
  }

  return outfile;
}

async function compile(bundlePath: string, target: Target): Promise<string> {
  const bunTarget = TARGETS[target];
  const ext = target.startsWith("win") ? ".exe" : "";
  const outfile = `dist/transcription-${target}${ext}`;

  // Compile bundle to standalone binary
  await $`bun build --compile --minify --bytecode --target=${bunTarget} ${bundlePath} --outfile ${outfile}`.quiet();

  return outfile;
}

async function checksums(): Promise<void> {
  await $`cd dist && shasum -a 256 transcription-* > checksums.txt`.quiet();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const requestedTarget = args[0] as Target | "all" | undefined;

  // Clean and create directories
  await $`rm -rf .build && mkdir -p .build dist`.quiet();

  console.log("Bundling...");
  const bundlePath = await bundle();

  const targets: Target[] = requestedTarget === "all" || !requestedTarget
    ? Object.keys(TARGETS) as Target[]
    : [requestedTarget];

  // Validate target
  if (requestedTarget && requestedTarget !== "all" && !TARGETS[requestedTarget as Target]) {
    console.error(`Unknown target: ${requestedTarget}`);
    console.error(`Valid targets: ${Object.keys(TARGETS).join(", ")}, all`);
    process.exit(1);
  }

  // Compile for each target
  for (const target of targets) {
    console.log(`Compiling ${target}...`);
    await compile(bundlePath, target);
  }

  // Generate checksums if building all
  if (targets.length > 1) {
    console.log("Generating checksums...");
    await checksums();
  }

  // macOS universal binary
  if (targets.includes("mac-arm64") && targets.includes("mac-x64")) {
    console.log("Creating macOS universal binary...");
    await $`lipo -create dist/transcription-mac-x64 dist/transcription-mac-arm64 -output dist/transcription-mac-universal`.quiet();
  }

  // Cleanup
  await $`rm -rf .build`.quiet();

  console.log("\nDone!");
  await $`ls -lh dist/`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
