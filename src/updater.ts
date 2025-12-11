/**
 * Auto-updater for standalone binary
 * Checks GitHub releases, downloads newer version, replaces self, restarts
 */

import { $ } from "bun";
import { VERSION, GITHUB_OWNER, GITHUB_REPO } from "./types";

interface GitHubRelease {
  tag_name: string;
  assets: { name: string; browser_download_url: string }[];
}

function getPlatformAssetName(): string {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "darwin" && arch === "arm64") return "transcription-mac-arm64";
  if (platform === "darwin" && arch === "x64") return "transcription-mac-x64";
  if (platform === "linux" && arch === "x64") return "transcription-linux-x64";
  if (platform === "linux" && arch === "arm64") return "transcription-linux-arm64";
  if (platform === "win32") return "transcription-win-x64.exe";

  return "";
}

function compareVersions(current: string, latest: string): number {
  // Remove 'v' prefix if present
  const c = current.replace(/^v/, "").split(".").map(Number);
  const l = latest.replace(/^v/, "").split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return 1;  // latest is newer
    if ((l[i] || 0) < (c[i] || 0)) return -1; // current is newer
  }
  return 0; // equal
}

export async function checkForUpdates(): Promise<{ available: boolean; version?: string; url?: string }> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      {
        headers: { "User-Agent": "transcription-app" },
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) return { available: false };

    const release: GitHubRelease = await response.json();
    const latestVersion = release.tag_name;

    if (compareVersions(VERSION, latestVersion) <= 0) {
      return { available: false };
    }

    // Find the right asset for this platform
    const assetName = getPlatformAssetName();
    const asset = release.assets.find(a => a.name === assetName);

    if (!asset) return { available: false };

    return {
      available: true,
      version: latestVersion,
      url: asset.browser_download_url
    };
  } catch {
    // Silent fail - don't block app if update check fails
    return { available: false };
  }
}

export async function downloadAndReplace(url: string, version: string): Promise<boolean> {
  const execPath = process.execPath;
  const tempPath = `${execPath}.new`;
  const backupPath = `${execPath}.backup`;

  try {
    console.log(`\x1b[36m[UPDATE]\x1b[0m Downloading ${version}...`);

    // Download new binary
    const response = await fetch(url);
    if (!response.ok) throw new Error("Download failed");

    const data = await response.arrayBuffer();
    await Bun.write(tempPath, data);

    // Make executable (Unix)
    if (process.platform !== "win32") {
      await $`chmod +x ${tempPath}`.quiet();
    }

    // Backup current binary
    await $`mv ${execPath} ${backupPath}`.quiet();

    // Replace with new binary
    await $`mv ${tempPath} ${execPath}`.quiet();

    // Remove backup on success
    await $`rm -f ${backupPath}`.quiet();

    console.log(`\x1b[32m[UPDATE]\x1b[0m Updated to ${version}! Restarting...`);

    return true;
  } catch (error) {
    // Rollback on failure
    try {
      await $`rm -f ${tempPath}`.quiet();
      await $`mv ${backupPath} ${execPath}`.quiet();
    } catch {}

    console.error(`\x1b[31m[UPDATE]\x1b[0m Update failed:`, error);
    return false;
  }
}

export async function autoUpdate(): Promise<void> {
  // Skip in dev mode (when running via bun, not compiled binary)
  if (process.execPath.includes("bun")) {
    return;
  }

  const update = await checkForUpdates();

  if (!update.available || !update.url || !update.version) {
    return;
  }

  console.log(`\x1b[33m[UPDATE]\x1b[0m New version available: ${update.version}`);

  const success = await downloadAndReplace(update.url, update.version);

  if (success) {
    // Restart the application
    const args = process.argv.slice(1);
    Bun.spawn([process.execPath, ...args], {
      stdio: ["inherit", "inherit", "inherit"],
    });
    process.exit(0);
  }
}
