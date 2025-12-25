import { describe, expect, test } from "bun:test";
import { SSEManager } from "../src/lib/sse";

describe("SSEManager", () => {
  test("starts with zero clients", () => {
    const sse = new SSEManager();
    expect(sse.getClientCount()).toBe(0);
  });

  test("increments client count on subscribe", async () => {
    const sse = new SSEManager();
    const iterator = sse.subscribe();

    // Start consuming and immediately send a message so it doesn't block
    const promise = iterator.next();
    sse.ping();

    await promise;
    expect(sse.getClientCount()).toBe(1);

    // Cleanup
    await iterator.return(undefined);
  });

  test("decrements client count on unsubscribe", async () => {
    const sse = new SSEManager();
    const iterator = sse.subscribe();

    // Start and send message to unblock
    const promise = iterator.next();
    sse.ping();
    await promise;

    expect(sse.getClientCount()).toBe(1);

    // Unsubscribe
    await iterator.return(undefined);
    expect(sse.getClientCount()).toBe(0);
  });

  test("broadcasts text to subscribers", async () => {
    const sse = new SSEManager();
    const iterator = sse.subscribe();

    // Start consuming
    const msgPromise = iterator.next();

    // Broadcast
    sse.broadcastText("Hello");

    const result = await msgPromise;
    expect(result.value).toEqual({ event: "text", data: { text: "Hello" } });

    await iterator.return(undefined);
  });

  test("broadcasts style to subscribers", async () => {
    const sse = new SSEManager();
    const iterator = sse.subscribe();

    const msgPromise = iterator.next();
    sse.broadcastStyle({ fontSize: 24 });

    const result = await msgPromise;
    expect(result.value).toEqual({ event: "style", data: { fontSize: 24 } });

    await iterator.return(undefined);
  });

  test("ping sends ping event", async () => {
    const sse = new SSEManager();
    const iterator = sse.subscribe();

    const msgPromise = iterator.next();
    sse.ping();

    const result = await msgPromise;
    expect(result.value).toEqual({ event: "ping", data: {} });

    await iterator.return(undefined);
  });

  test("shutdown sends shutdown event", async () => {
    const sse = new SSEManager();
    const iterator = sse.subscribe();

    const msgPromise = iterator.next();
    sse.shutdown();

    const result = await msgPromise;
    expect(result.value).toEqual({ event: "shutdown", data: {} });

    await iterator.return(undefined);
  });

  test("multiple clients receive same broadcast", async () => {
    const sse = new SSEManager();
    const iter1 = sse.subscribe();
    const iter2 = sse.subscribe();

    const msg1 = iter1.next();
    const msg2 = iter2.next();

    await Bun.sleep(10);
    expect(sse.getClientCount()).toBe(2);

    sse.broadcastText("Broadcast");

    const [r1, r2] = await Promise.all([msg1, msg2]);
    expect(r1.value).toEqual({ event: "text", data: { text: "Broadcast" } });
    expect(r2.value).toEqual({ event: "text", data: { text: "Broadcast" } });

    await Promise.all([iter1.return(undefined), iter2.return(undefined)]);
  });
});
