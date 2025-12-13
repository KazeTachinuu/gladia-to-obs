import { z } from "zod";

export const broadcastSchema = z.object({
  text: z.string().min(1).max(10_000),
});

export const styleSchema = z.object({
  fontSize: z.coerce.number().min(8).max(200).optional(),
  posX: z.coerce.number().min(0).max(100).optional(),
  posY: z.coerce.number().min(0).max(100).optional(),
  bgStyle: z.enum(["none", "box"]).optional(),
});

export type StylePayload = z.infer<typeof styleSchema>;
