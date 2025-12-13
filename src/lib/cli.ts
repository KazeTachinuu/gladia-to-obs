import { parseArgs } from "node:util";
import { VERSION } from "../config";

export const { values: cliArgs } = parseArgs({
  args: process.argv.slice(2).filter((a) => a.startsWith("-")),
  options: {
    "no-browser": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  allowPositionals: false,
  strict: false,
});

export function showHelp() {
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
