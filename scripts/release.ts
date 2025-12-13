#!/usr/bin/env bun
import { $ } from "bun";

const type = process.argv[2] as "patch" | "minor" | "major" | undefined;
if (!type || !["patch", "minor", "major"].includes(type)) {
  console.log("Usage: bun run release <patch|minor|major>");
  process.exit(1);
}

// Read current version
const pkg = await Bun.file("package.json").json();
const [major, minor, patch] = pkg.version.split(".").map(Number);

// Bump
const newVersion =
  type === "major" ? `${major + 1}.0.0` :
  type === "minor" ? `${major}.${minor + 1}.0` :
  `${major}.${minor}.${patch + 1}`;

// Update package.json
pkg.version = newVersion;
await Bun.write("package.json", JSON.stringify(pkg, null, 2) + "\n");

// Update src/config.ts
const config = await Bun.file("src/config.ts").text();
await Bun.write(
  "src/config.ts",
  config.replace(/VERSION = "[^"]+"/, `VERSION = "${newVersion}"`)
);

// Git
await $`git add package.json src/config.ts`;
await $`git commit -m "release: v${newVersion}"`;
await $`git tag v${newVersion}`;
await $`git push && git push --tags`;

console.log(`\n✓ Released v${newVersion}`);
