import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { forwardRequest } from "../src/forward.js";
import type { CapturedRequest } from "../src/types.js";

let server: http.Server | undefined;
function startTarget(handler: http.RequestListener): Promise<number> {
  return new Promise((resolve) => {
    server = http.createServer(handler);
    server.listen(0, () => resolve((server!.address() as AddressInfo).port));
  });
}
afterEach(() => server?.close());

const base: CapturedRequest = {
  id: "1",
  method: "POST",
  path: "/pedido",
  query: { n: "1" },
  headers: { "X-Test": "yes", host: "ignorar" },
  body: "hola",
};

describe("forwardRequest", () => {
  it("reenvía method, path, query, headers (saneados) y body", async () => {
    let got: {
      method?: string;
      url?: string;
      xtest?: string;
      host?: string;
      body?: string;
    } = {};
    const port = await startTarget((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        got = {
          method: req.method,
          url: req.url,
          xtest: req.headers["x-test"] as string,
          host: req.headers["host"],
          body,
        };
        res.writeHead(200);
        res.end("ok");
      });
    });

    const result = await forwardRequest(base, `http://127.0.0.1:${port}`, {
      timeoutMs: 5000,
    });

    expect(got.method).toBe("POST");
    expect(got.url).toBe("/pedido?n=1");
    expect(got.xtest).toBe("yes");
    // host NO debe ser el capturado "ignorar"; lo fija el cliente HTTP.
    expect(got.host).not.toBe("ignorar");
    expect(got.body).toBe("hola");
    expect(result.status).toBe(200);
    expect(result.error).toBeNull();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("devuelve error y status null si el destino está caído", async () => {
    const result = await forwardRequest(
      { ...base, method: "GET", body: "" },
      "http://127.0.0.1:1",
      { timeoutMs: 1000 },
    );
    expect(result.status).toBeNull();
    expect(result.error).toBeTruthy();
  });
});
