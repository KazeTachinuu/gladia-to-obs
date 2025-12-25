import { describe, expect, test } from "bun:test";
import { broadcastSchema, styleSchema } from "../src/lib/validators";

describe("broadcastSchema", () => {
  test("accepts valid text", () => {
    const result = broadcastSchema.safeParse({ text: "Hello world" });
    expect(result.success).toBe(true);
  });

  test("rejects empty text", () => {
    const result = broadcastSchema.safeParse({ text: "" });
    expect(result.success).toBe(false);
  });

  test("rejects missing text", () => {
    const result = broadcastSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  test("rejects text exceeding 10k characters", () => {
    const result = broadcastSchema.safeParse({ text: "a".repeat(10_001) });
    expect(result.success).toBe(false);
  });

  test("accepts text at max length (10k)", () => {
    const result = broadcastSchema.safeParse({ text: "a".repeat(10_000) });
    expect(result.success).toBe(true);
  });
});

describe("styleSchema", () => {
  test("accepts valid style with all fields", () => {
    const result = styleSchema.safeParse({
      fontSize: 24,
      posX: 50,
      posY: 80,
      bgStyle: "box",
    });
    expect(result.success).toBe(true);
  });

  test("accepts empty object (all fields optional)", () => {
    const result = styleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  test("accepts partial style", () => {
    const result = styleSchema.safeParse({ fontSize: 32 });
    expect(result.success).toBe(true);
  });

  test("coerces string numbers", () => {
    const result = styleSchema.safeParse({ fontSize: "24" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fontSize).toBe(24);
    }
  });

  test("rejects fontSize below minimum (8)", () => {
    const result = styleSchema.safeParse({ fontSize: 7 });
    expect(result.success).toBe(false);
  });

  test("rejects fontSize above maximum (200)", () => {
    const result = styleSchema.safeParse({ fontSize: 201 });
    expect(result.success).toBe(false);
  });

  test("rejects posX below 0", () => {
    const result = styleSchema.safeParse({ posX: -1 });
    expect(result.success).toBe(false);
  });

  test("rejects posX above 100", () => {
    const result = styleSchema.safeParse({ posX: 101 });
    expect(result.success).toBe(false);
  });

  test("rejects posY below 0", () => {
    const result = styleSchema.safeParse({ posY: -1 });
    expect(result.success).toBe(false);
  });

  test("rejects posY above 100", () => {
    const result = styleSchema.safeParse({ posY: 101 });
    expect(result.success).toBe(false);
  });

  test("accepts bgStyle 'none'", () => {
    const result = styleSchema.safeParse({ bgStyle: "none" });
    expect(result.success).toBe(true);
  });

  test("accepts bgStyle 'box'", () => {
    const result = styleSchema.safeParse({ bgStyle: "box" });
    expect(result.success).toBe(true);
  });

  test("rejects invalid bgStyle", () => {
    const result = styleSchema.safeParse({ bgStyle: "gradient" });
    expect(result.success).toBe(false);
  });
});
