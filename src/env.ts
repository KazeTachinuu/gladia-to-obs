/**
 * Environment Configuration (T3 Env)
 *
 * Type-safe environment variable validation using @t3-oss/env-core.
 * All environment variables are validated at startup.
 */

import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Server
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    HOST: z.string().default("0.0.0.0"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    // Logging
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

    // CORS
    CORS_ORIGIN: z.string().default("*"),

    // Rate limiting
    RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  },

  /**
   * Runtime environment - uses process.env in Node/Bun
   */
  runtimeEnv: process.env,

  /**
   * Skip validation in test environment
   */
  skipValidation: process.env["SKIP_ENV_VALIDATION"] === "true",

  /**
   * Treat empty strings as undefined
   */
  emptyStringAsUndefined: true,
});

// Derived values for convenience
export const isDev = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

// Type export
export type Env = typeof env;
