/**
 * CLI argument parsing for both dev and compiled binary modes
 *
 * In compiled Bun binaries, process.argv can contain:
 *   [0] = internal bun path (e.g., /$bunfs/root/binary-name)
 *   [1] = actual executable path
 *   [2+] = user-provided arguments
 *
 * This module provides a consistent interface for CLI args.
 */

import { parseArgs } from "node:util";
import { VERSION } from "../config";

/** CLI options definition */
const CLI_OPTIONS = {
  "no-browser": { type: "boolean", default: false },
  help: { type: "boolean", short: "h", default: false },
} as const;

/**
 * Get user-provided CLI arguments, filtering out any path artifacts
 * that may leak through in compiled binaries.
 */
export function getUserArgs(): string[] {
  return process.argv.slice(2).filter((arg) => {
    // Only keep actual CLI flags (starts with -)
    // This filters out any path-like arguments that shouldn't be there
    return arg.startsWith("-");
  });
}

/** Parsed CLI arguments */
export const { values: cliArgs } = parseArgs({
  args: getUserArgs(),
  options: CLI_OPTIONS,
  allowPositionals: false,
  strict: false,
});

/** Show help message and exit */
export function showHelp(): void {
  console.log(`
Transcription v${VERSION}
Live captions for OBS / VMix

Usage: transcription [options]

Options:
  --no-browser    Don't open browser automatically
  -h, --help      Show this help message
`);
  process.exit(0);
}
