import { describe, it, expect, vi } from "vitest";
import type { Response } from "express";
import { SseHub } from "../src/sse/hub.js";

/** Crea un objeto que imita lo justo de `express.Response` para el hub. */
function fakeResponse() {
  const handlers: Record<string, () => void> = {};
  return {
    writeHead: vi.fn(),
    write: vi.fn(),
    on: vi.fn((event: string, cb: () => void) => {
      handlers[event] = cb;
    }),
    // Permite simular el cierre de la conexión.
    _close: () => handlers["close"]?.(),
  } as unknown as Response & { _close: () => void };
}

describe("SseHub", () => {
  it("registra suscriptores y difunde eventos con formato SSE", () => {
    const hub = new SseHub();
    const res = fakeResponse();

    hub.subscribe("tok", res);
    expect(hub.subscriberCount("tok")).toBe(1);
    expect(res.writeHead).toHaveBeenCalled();

    hub.broadcast("tok", "request", { hello: "world" });
    expect(res.write).toHaveBeenCalledWith(
      'event: request\ndata: {"hello":"world"}\n\n',
    );
  });

  it("elimina al suscriptor cuando se cierra la conexión", () => {
    const hub = new SseHub();
    const res = fakeResponse();
    hub.subscribe("tok", res);
    expect(hub.subscriberCount("tok")).toBe(1);

    (res as Response & { _close: () => void })._close();
    expect(hub.subscriberCount("tok")).toBe(0);
  });
});
