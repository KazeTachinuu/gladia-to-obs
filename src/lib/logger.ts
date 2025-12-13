const isCompiledBinary = !process.execPath.includes("bun");

export const createLogger = (module: string) => ({
  debug: (...args: unknown[]) => !isCompiledBinary && console.debug(`[${module}]`, ...args),
  info: (...args: unknown[]) => !isCompiledBinary && console.info(`[${module}]`, ...args),
  warn: (...args: unknown[]) => console.warn(`[${module}]`, ...args),
  error: (...args: unknown[]) => console.error(`[${module}]`, ...args),
  fatal: (...args: unknown[]) => console.error(`[${module}] FATAL:`, ...args),
});
