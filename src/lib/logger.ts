/**
 * Structured Logger (Pino)
 *
 * Production-ready logging with:
 * - JSON output in production
 * - Pretty printing in development
 * - Request context support
 * - Child loggers for modules
 */

import pino from "pino";
import { env, isDev } from "../env";

// Only use pino-pretty in dev mode AND when running via bun (not compiled binary)
// Compiled binaries can't dynamically load pino-pretty transport
const isCompiledBinary = !process.execPath.includes("bun");
const usePrettyLogs = isDev && !isCompiledBinary;

// In compiled binary: only show warnings/errors to keep the UI clean
// Users don't need to see every HTTP request
const logLevel = isCompiledBinary ? "warn" : env.LOG_LEVEL;

export const logger = usePrettyLogs
  ? pino({
      level: env.LOG_LEVEL,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
      base: { pid: false },
      formatters: { level: (label) => ({ level: label }) },
    })
  : pino({
      level: logLevel,
      base: { pid: false },
      formatters: { level: (label) => ({ level: label }) },
    });

/**
 * Create a child logger with a specific module name
 */
export function createLogger(module: string) {
  return logger.child({ module });
}

export type Logger = ReturnType<typeof createLogger>;
