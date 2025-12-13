import pc from "picocolors";

// Re-export picocolors for direct use
export { pc };

// Semantic helpers
export const log = {
  step: (msg: string) => console.log(`${pc.cyan("→")} ${msg}`),
  success: (msg: string) => console.log(`${pc.green("✓")} ${msg}`),
  warn: (msg: string) => console.log(`${pc.yellow("!")} ${msg}`),
  error: (msg: string) => console.error(`${pc.red("✗")} ${msg}`),
  info: (msg: string) => console.log(`${pc.dim("·")} ${msg}`),
};
