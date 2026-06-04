import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { makeTestApp, createWebhook, unlock, type TestContext } from "./helpers.js";

describe("API de peticiones (ciclo completo)", () => {
  let ctx: TestContext;
  beforeEach(async () => {
    ctx = await makeTestApp();
  });

  it("crea → desbloquea → lista → ingiere → lista → borra → limpia", async () => {
    const token = await createWebhook(request, ctx.app);
    const jwt = await unlock(request, ctx.app, token);
    const authed = (m: "get" | "delete", url: string) =>
      request(ctx.app)[m](url).set("Authorization", `Bearer ${jwt}`);

    // Historial vacío al inicio.
    let list = await authed("get", `/api/webhooks/${token}/requests`).expect(200);
    expect(list.body.count).toBe(0);

    // Ingerimos dos peticiones.
    await request(ctx.app).post(`/h/${token}`).send({ n: 1 }).expect(200);
    await request(ctx.app).get(`/h/${token}/ping`).expect(200);

    list = await authed("get", `/api/webhooks/${token}/requests`).expect(200);
    expect(list.body.count).toBe(2);
    expect(list.body.requests).toHaveLength(2);

    // Detalle de una.
    const id = list.body.requests[0].id;
    const detail = await authed(
      "get",
      `/api/webhooks/${token}/requests/${id}`,
    ).expect(200);
    expect(detail.body.request.id).toBe(id);

    // Borrar una.
    await authed("delete", `/api/webhooks/${token}/requests/${id}`).expect(200);
    list = await authed("get", `/api/webhooks/${token}/requests`).expect(200);
    expect(list.body.count).toBe(1);

    // Limpiar todo.
    const cleared = await authed(
      "delete",
      `/api/webhooks/${token}/requests`,
    ).expect(200);
    expect(cleared.body.cleared).toBe(1);
    list = await authed("get", `/api/webhooks/${token}/requests`).expect(200);
    expect(list.body.count).toBe(0);
  });

  it("404 al pedir una petición inexistente", async () => {
    const token = await createWebhook(request, ctx.app);
    const jwt = await unlock(request, ctx.app, token);
    await request(ctx.app)
      .get(`/api/webhooks/${token}/requests/no-existe`)
      .set("Authorization", `Bearer ${jwt}`)
      .expect(404);
  });
});
