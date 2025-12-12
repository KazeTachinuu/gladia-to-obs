/**
 * Schema Validators (Zod)
 *
 * Runtime validation for API payloads using Zod.
 * Used with Elysia's built-in validation.
 */

import { z } from "zod";

// =============================================================================
// BROADCAST SCHEMA
// =============================================================================

export const broadcastSchema = z.object({
  text: z
    .string({ message: "Field 'text' is required" })
    .min(1, "Field 'text' cannot be empty")
    .max(10_000, "Field 'text' exceeds maximum length of 10000 characters"),
});

export type BroadcastPayload = z.infer<typeof broadcastSchema>;

// =============================================================================
// STYLE SCHEMA
// =============================================================================

export const styleSchema = z.object({
  fontSize: z.coerce.number().min(8).max(200).optional(),
  posX: z.coerce.number().min(0).max(100).optional(),
  posY: z.coerce.number().min(0).max(100).optional(),
  bgStyle: z.enum(["none", "box"]).optional(),
});

export type StylePayload = z.infer<typeof styleSchema>;
