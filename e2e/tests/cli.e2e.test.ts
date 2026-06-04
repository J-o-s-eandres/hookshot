import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  startServer,
  startEcho,
  http_,
  createWebhook,
  spawnCli,
  sleep,
  type RunningServer,
  type Echo,
} from "./harness.js";

let srv: RunningServer;
let base: string;

beforeAll(async () => {
  srv = await startServer();
  base = srv.base;
}, 30_000);

afterAll(async () => {
  await srv?.stop();
});

describe("e2e · CLI túnel", () => {
  it("reenvía las peticiones del webhook al destino local", async () => {
    const echo: Echo = await startEcho(200);
    const token = await createWebhook(base);
    let cli: ChildProcess | undefined;
    try {
      cli = spawnCli([
        "listen",
        "--token", token,
        "--pin", "1234",
        "--target", `http://127.0.0.1:${echo.port}`,
        "--server", base,
      ]);

      // Esperar a que el CLI conecte (unlock + SSE).
      await sleep(1800);

      // Enviar una petición al webhook.
      await http_(base, "POST", `/h/${token}/pedido?n=9`, { body: { hola: "mundo" } });

      // Esperar a que el echo local la reciba (reenviada por el CLI).
      let got = false;
      for (let i = 0; i < 16 && !got; i++) {
        if (echo.last()) got = true;
        else await sleep(250);
      }
      expect(got).toBe(true);
      expect(echo.last()?.method).toBe("POST");
      expect(echo.last()?.url).toBe("/pedido?n=9");
      expect(echo.last()?.body).toBe('{"hola":"mundo"}');
    } finally {
      cli?.kill();
      echo.close();
    }
  });
});
