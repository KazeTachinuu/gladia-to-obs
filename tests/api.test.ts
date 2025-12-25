import { describe, expect, test } from "bun:test";
import { app } from "../src/index";

const BASE = "http://localhost";

describe("GET /health", () => {
  test("returns ok status", async () => {
    const res = await app.handle(new Request(`${BASE}/health`));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("ok");
    expect(json.version).toBeDefined();
    expect(typeof json.clients).toBe("number");
    expect(typeof json.uptime).toBe("number");
  });
});

describe("GET /overlay", () => {
  test("returns HTML content", async () => {
    const res = await app.handle(new Request(`${BASE}/overlay`));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/html; charset=utf-8");

    const html = await res.text();
    expect(html).toContain("<!DOCTYPE html>");
  });
});

describe("GET /network-ip", () => {
  test("returns ip field", async () => {
    const res = await app.handle(new Request(`${BASE}/network-ip`));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect("ip" in json).toBe(true);
  });
});

describe("GET /favicon.ico", () => {
  test("returns 204 no content", async () => {
    const res = await app.handle(new Request(`${BASE}/favicon.ico`));
    expect(res.status).toBe(204);
  });
});

describe("POST /broadcast", () => {
  test("accepts valid text", async () => {
    const res = await app.handle(
      new Request(`${BASE}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Hello world" }),
      })
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
  });

  test("rejects empty text", async () => {
    const res = await app.handle(
      new Request(`${BASE}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "" }),
      })
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBeDefined();
  });

  test("rejects missing text field", async () => {
    const res = await app.handle(
      new Request(`${BASE}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );

    const json = await res.json();
    expect(json.success).toBe(false);
  });
});

describe("POST /style", () => {
  test("accepts valid style", async () => {
    const res = await app.handle(
      new Request(`${BASE}/style`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fontSize: 24, posX: 50, posY: 80 }),
      })
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
  });

  test("accepts empty object", async () => {
    const res = await app.handle(
      new Request(`${BASE}/style`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
  });

  test("rejects invalid fontSize", async () => {
    const res = await app.handle(
      new Request(`${BASE}/style`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fontSize: 500 }),
      })
    );

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBeDefined();
  });

  test("rejects invalid bgStyle", async () => {
    const res = await app.handle(
      new Request(`${BASE}/style`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bgStyle: "invalid" }),
      })
    );

    const json = await res.json();
    expect(json.success).toBe(false);
  });
});
