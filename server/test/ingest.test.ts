import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { makeTestApp, createWebhook, unlock, type TestContext } from "./helpers.js";

describe("ingesta", () => {
  let ctx: TestContext;
  beforeEach(async () => {
    ctx = await makeTestApp();
  });

  it("captura método, headers y body, y responde con la respuesta por defecto", async () => {
    const token = await createWebhook(request, ctx.app);

    const res = await request(ctx.app)
      .post(`/h/${token}/orders/new`)
      .set("X-Custom", "hola")
      .send({ amount: 42 })
      .expect(200);

    // Respuesta por defecto del webhook.
    expect(res.body).toEqual({ ok: true, message: "Captured by HookShot" });

    // La petición quedó guardada y es visible tras desbloquear.
    const jwt = await unlock(request, ctx.app, token);
    const list = await request(ctx.app)
      .get(`/api/webhooks/${token}/requests`)
      .set("Authorization", `Bearer ${jwt}`)
      .expect(200);

    expect(list.body.count).toBe(1);
    const captured = list.body.requests[0];
    expect(captured.method).toBe("POST");
    expect(captured.path).toBe("/orders/new");
    expect(captured.headers["x-custom"]).toBe("hola");
    expect(JSON.parse(captured.body)).toEqual({ amount: 42 });
    expect(captured.size).toBeGreaterThan(0);
  });

  it("devuelve la respuesta personalizada configurada", async () => {
    const token = await createWebhook(request, ctx.app);
    const jwt = await unlock(request, ctx.app, token);

    await request(ctx.app)
      .patch(`/api/webhooks/${token}/response`)
      .set("Authorization", `Bearer ${jwt}`)
      .send({
        status: 418,
        contentType: "text/plain",
        headers: { "X-Teapot": "yes" },
        body: "soy una tetera",
      })
      .expect(200);

    const res = await request(ctx.app).get(`/h/${token}`).expect(418);
    expect(res.text).toBe("soy una tetera");
    expect(res.headers["x-teapot"]).toBe("yes");
    expect(res.headers["content-type"]).toContain("text/plain");
  });

  it("responde 404 si el token no existe", async () => {
    await request(ctx.app).post("/h/no-existe").send({}).expect(404);
  });
});
