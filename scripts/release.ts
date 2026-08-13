#!/usr/bin/env bun
import { $ } from "bun";
import pc from "picocolors";

const type = process.argv[2] as "patch" | "minor" | "major" | undefined;
if (!type || !["patch", "minor", "major"].includes(type)) {
  console.log(`Usage: bun run release ${pc.dim("<patch|minor|major>")}`);
  process.exit(1);
}

const pkg = await Bun.file("package.json").json();
const [major, minor, patch] = pkg.version.split(".").map(Number);

const newVersion =
  type === "major" ? `${major + 1}.0.0` :
  type === "minor" ? `${major}.${minor + 1}.0` :
  `${major}.${minor}.${patch + 1}`;

pkg.version = newVersion;
await Bun.write("package.json", JSON.stringify(pkg, null, 2) + "\n");

const config = await Bun.file("src/config.ts").text();
await Bun.write(
  "src/config.ts",
  config.replace(/VERSION = "[^"]+"/, `VERSION = "${newVersion}"`)
);

await $`git add package.json src/config.ts`;
await $`git commit -m "release: v${newVersion}"`;
await $`git tag v${newVersion}`;
await $`git push && git push --tags`;

console.log(`\n${pc.green("✓")} Released ${pc.bold(`v${newVersion}`)}`);
