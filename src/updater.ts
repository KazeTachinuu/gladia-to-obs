import semver from "semver";
import { GITHUB_OWNER, GITHUB_REPO, VERSION } from "./config";
import { pc } from "./lib/terminal";

export async function checkForUpdate(): Promise<void> {
  if (process.execPath.includes("bun")) return; // Skip in dev

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      {
        headers: { "User-Agent": "transcription" },
        signal: AbortSignal.timeout(3000),
      }
    );
    if (!res.ok) return;

    const { tag_name } = await res.json();
    if (semver.gt(tag_name, VERSION)) {
      const installCmd = `curl -fsSL https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/master/install.sh | bash`;
      console.log(`\n  ${pc.yellow(`Update available: ${tag_name}`)}`);
      console.log(`  ${pc.dim(`Run: ${installCmd}`)}\n`);
    }
  } catch {}
}
