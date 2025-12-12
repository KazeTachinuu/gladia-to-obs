/**
 * Shared Type Definitions
 *
 * Re-exports and shared types used across the application.
 */

// Re-export config values for backward compatibility
export { GITHUB_OWNER, GITHUB_REPO, VERSION } from "./config";

// Re-export env for convenience
export { env, isDev, isProd, isTest } from "./env";

/**
 * Generic API response type
 */
export type ApiResponse<T = void> = { success: true; data?: T } | { success: false; error: string };
