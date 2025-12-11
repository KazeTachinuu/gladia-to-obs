/**
 * First-run setup: installs binary to PATH
 * Follows best practices from bun/deno/cargo installers
 */

import { $ } from "bun";
import { existsSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";

const BINARY_NAME = "transcription";

// Standard install locations per platform
function getInstallDir(): string {
  const home = homedir();
  if (process.platform === "win32") {
    // Windows: use AppData\Local\Programs (standard for user installs)
    return join(home, "AppData", "Local", "Programs", BINARY_NAME);
  }
  // Unix: ~/.local/bin (XDG compliant, widely supported)
  return join(home, ".local", "bin");
}

async function isInPath(): Promise<boolean> {
  try {
    const result = await $`which ${BINARY_NAME}`.quiet().nothrow();
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

function detectShell(): { shell: string; config: string } | null {
  const home = homedir();
  const shellEnv = process.env.SHELL || "";
  const shellName = shellEnv.split("/").pop() || "";

  // Shell configs in order of preference
  const configs: Record<string, string[]> = {
    zsh: [".zshrc", ".zshenv"],
    bash: [".bashrc", ".bash_profile", ".profile"],
    fish: [".config/fish/config.fish"],
  };

  // Try detected shell first
  if (shellName && configs[shellName]) {
    for (const file of configs[shellName]) {
      const path = join(home, file);
      if (existsSync(path)) return { shell: shellName, config: path };
    }
    // Create default config for detected shell
    return { shell: shellName, config: join(home, configs[shellName][0]) };
  }

  // Fallback: check all common configs
  for (const [shell, files] of Object.entries(configs)) {
    for (const file of files) {
      const path = join(home, file);
      if (existsSync(path)) return { shell, config: path };
    }
  }

  return null;
}

async function addToPathUnix(installDir: string): Promise<boolean> {
  const shell = detectShell();
  if (!shell) return false;

  try {
    const content = existsSync(shell.config)
      ? await Bun.file(shell.config).text()
      : "";

    // Already configured
    if (content.includes(installDir)) return true;

    // Generate shell-appropriate export
    let exportLine: string;
    if (shell.shell === "fish") {
      exportLine = `set -gx PATH "${installDir}" $PATH`;
    } else {
      exportLine = `export PATH="${installDir}:$PATH"`;
    }

    const addition = `\n# ${BINARY_NAME}\n${exportLine}\n`;
    await Bun.write(shell.config, content + addition);
    return true;
  } catch {
    return false;
  }
}

async function addToPathWindows(installDir: string): Promise<boolean> {
  try {
    // Add to user PATH via PowerShell (doesn't require admin)
    const cmd = `$p=[Environment]::GetEnvironmentVariable('PATH','User');if($p-notlike'*${installDir}*'){[Environment]::SetEnvironmentVariable('PATH',"${installDir};$p",'User')}`;
    await $`powershell -NoProfile -Command ${cmd}`.quiet();
    return true;
  } catch {
    return false;
  }
}

export async function ensureInPath(): Promise<void> {
  // Skip in dev mode (running via bun runtime)
  if (process.execPath.includes("bun")) return;

  // Already in PATH - nothing to do
  if (await isInPath()) return;

  const execPath = process.execPath;
  const installDir = getInstallDir();
  const destPath = join(installDir, process.platform === "win32" ? `${BINARY_NAME}.exe` : BINARY_NAME);

  // Already in correct location, just need PATH update
  const alreadyInstalled = execPath === destPath;

  try {
    if (!alreadyInstalled) {
      // Create install directory
      await $`mkdir -p ${installDir}`.quiet();

      // Copy binary to install location
      if (process.platform === "win32") {
        await $`copy "${execPath}" "${destPath}"`.quiet();
      } else {
        await $`cp "${execPath}" "${destPath}" && chmod +x "${destPath}"`.quiet();
      }
    }

    // Add to PATH
    const pathAdded = process.platform === "win32"
      ? await addToPathWindows(installDir)
      : await addToPathUnix(installDir);

    if (pathAdded) {
      console.log(`\x1b[32m[SETUP]\x1b[0m Installed to ${destPath}`);
      if (process.platform === "win32") {
        console.log(`        Restart terminal, then run: \x1b[1m${BINARY_NAME}\x1b[0m\n`);
      } else {
        console.log(`        Run: \x1b[1msource ~/${detectShell()?.config.split("/").pop()} && ${BINARY_NAME}\x1b[0m`);
        console.log(`        Or restart your terminal.\n`);
      }
    }
  } catch {
    // Silent fail - user can still run from current location
  }
}
