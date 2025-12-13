#!/usr/bin/env bun
/**
 * Syncs version from package.json to src/config.ts
 * Called automatically by bumpp after version bump
 */

const pkg = await Bun.file("package.json").json();
const configPath = "src/config.ts";
const config = await Bun.file(configPath).text();

const updated = config.replace(
  /export const VERSION = "[^"]+"/,
  `export const VERSION = "${pkg.version}"`
);

await Bun.write(configPath, updated);
console.log(`Synced version to ${pkg.version}`);
