import { GITHUB_OWNER, GITHUB_REPO, VERSION } from "./config";

export async function checkForUpdate(): Promise<void> {
  if (process.execPath.includes("bun")) return; // Skip in dev

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`, {
      headers: { "User-Agent": "transcription" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return;

    const { tag_name } = await res.json();
    const latest = tag_name.replace(/^v/, "").split(".").map(Number);
    const current = VERSION.split(".").map(Number);

    for (let i = 0; i < 3; i++) {
      if ((latest[i] || 0) > (current[i] || 0)) {
        console.log(`\n  \x1b[33mUpdate available: ${tag_name}\x1b[0m`);
        console.log(`  \x1b[2mRun: curl -fsSL https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/master/install.sh | bash\x1b[0m\n`);
        return;
      }
      if ((latest[i] || 0) < (current[i] || 0)) return;
    }
  } catch {}
}
