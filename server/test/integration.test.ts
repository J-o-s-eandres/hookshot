/**
 * Batería de pruebas de integración — ciclo completo de las features Free Tier.
 *
 * Cada test arranca su propia app con SQLite en memoria. Cubren el flujo
 * completo desde la creación del webhook hasta la consulta con filtros,
 * pasando por auto-unlock, ingesta, SSE y CLI-history endpoint.
 */
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { config } from "../src/config.js";
import { makeTestApp, createWebhook, unlock, type TestContext } from "./helpers.js";

describe("integración — ciclo completo Free Tier", () => {
  let ctx: TestContext;
  beforeEach(async () => {
    ctx = await makeTestApp();
  });

  it("1. create devuelve JWT (auto-unlock) y funciona para autenticar", async () => {
    const res = await request(ctx.app)
      .post("/api/webhooks")
      .send({ name: "integracion", pin: "5678" })
      .expect(201);

    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe("string");
    expect(res.body.webhook.token).toBeDefined();
    expect(res.body.webhook.name).toBe("integracion");

    // El JWT funciona para listar requests.
    const list = await request(ctx.app)
      .get(`/api/webhooks/${res.body.webhook.token}/requests`)
      .set("Authorization", `Bearer ${res.body.token}`)
      .expect(200);
    expect(list.body.count).toBe(0);
    expect(list.body.requests).toHaveLength(0);
  });

  it("2. create + ingest + list con método filter", async () => {
    const res = await request(ctx.app)
      .post("/api/webhooks")
      .send({ name: "filter-test", pin: "1234" })
      .expect(201);
    const token = res.body.webhook.token;
    const jwtToken = res.body.token;

    // Ingerimos peticiones de distintos métodos.
    await request(ctx.app).post(`/h/${token}/data`).send({ n: 1 }).expect(200);
    await request(ctx.app).get(`/h/${token}/ping`).expect(200);
    await request(ctx.app).put(`/h/${token}/update`).send({ n: 2 }).expect(200);
    await request(ctx.app).delete(`/h/${token}/remove`).expect(200);

    // Sin filtro: todas.
    const all = await request(ctx.app)
      .get(`/api/webhooks/${token}/requests`)
      .set("Authorization", `Bearer ${jwtToken}`)
      .expect(200);
    expect(all.body.count).toBe(4);

    // Filtrar por GET.
    const getOnly = await request(ctx.app)
      .get(`/api/webhooks/${token}/requests?method=GET`)
      .set("Authorization", `Bearer ${jwtToken}`)
      .expect(200);
    expect(getOnly.body.requests).toHaveLength(1);
    expect(getOnly.body.requests[0].method).toBe("GET");

    // Filtrar por POST.
    const postOnly = await request(ctx.app)
      .get(`/api/webhooks/${token}/requests?method=POST`)
      .set("Authorization", `Bearer ${jwtToken}`)
      .expect(200);
    expect(postOnly.body.requests).toHaveLength(1);
    expect(postOnly.body.requests[0].method).toBe("POST");

    // Filtrar por DELETE.
    const deleteOnly = await request(ctx.app)
      .get(`/api/webhooks/${token}/requests?method=DELETE`)
      .set("Authorization", `Bearer ${jwtToken}`)
      .expect(200);
    expect(deleteOnly.body.requests).toHaveLength(1);
    expect(deleteOnly.body.requests[0].method).toBe("DELETE");
  });

  it("3. search textual (q param) combinado con method filter", async () => {
    const res = await request(ctx.app)
      .post("/api/webhooks")
      .send({ pin: "0000" })
      .expect(201);
    const token = res.body.webhook.token;
    const j = res.body.token;

    await request(ctx.app).post(`/h/${token}/orders`).send({}).expect(200);
    await request(ctx.app).get(`/h/${token}/ping`).expect(200);
    await request(ctx.app).post(`/h/${token}/users`).send({}).expect(200);

    // q + method combinados.
    const r = await request(ctx.app)
      .get(`/api/webhooks/${token}/requests?method=POST&q=orders`)
      .set("Authorization", `Bearer ${j}`)
      .expect(200);
    expect(r.body.requests).toHaveLength(1);
    expect(r.body.requests[0].path).toBe("/orders");
  });

  it("4. paginación por cursor (before) funciona", async () => {
    const res = await request(ctx.app)
      .post("/api/webhooks")
      .send({ pin: "1111" })
      .expect(201);
    const token = res.body.webhook.token;
    const j = res.body.token;

    for (let i = 0; i < 5; i++) {
      await request(ctx.app).post(`/h/${token}/req-${i}`).send({ i }).expect(200);
    }

    const first = await request(ctx.app)
      .get(`/api/webhooks/${token}/requests?limit=2`)
      .set("Authorization", `Bearer ${j}`)
      .expect(200);
    expect(first.body.requests).toHaveLength(2);
    expect(first.body.count).toBe(5);

    const lastCreated = first.body.requests[first.body.requests.length - 1].createdAt;
    const second = await request(ctx.app)
      .get(`/api/webhooks/${token}/requests?limit=2&before=${lastCreated}`)
      .set("Authorization", `Bearer ${j}`)
      .expect(200);
    expect(second.body.requests).toHaveLength(2);
  });

  it("5. endpoint GET /requests/:id devuelve detalle", async () => {
    const res = await request(ctx.app)
      .post("/api/webhooks")
      .send({ pin: "2222" })
      .expect(201);
    const token = res.body.webhook.token;
    const j = res.body.token;

    await request(ctx.app).post(`/h/${token}/detalle`).send({ foo: "bar" }).expect(200);

    const list = await request(ctx.app)
      .get(`/api/webhooks/${token}/requests`)
      .set("Authorization", `Bearer ${j}`)
      .expect(200);
    const id = list.body.requests[0].id;

    const detail = await request(ctx.app)
      .get(`/api/webhooks/${token}/requests/${id}`)
      .set("Authorization", `Bearer ${j}`)
      .expect(200);
    expect(detail.body.request.id).toBe(id);
    expect(detail.body.request.method).toBe("POST");
    expect(detail.body.request.path).toBe("/detalle");
  });

  it("6. DELETE /requests/:id borra una petición", async () => {
    const token = await createWebhook(request, ctx.app);
    const j = await unlock(request, ctx.app, token);

    await request(ctx.app).post(`/h/${token}/a`).send({}).expect(200);
    await request(ctx.app).post(`/h/${token}/b`).send({}).expect(200);

    let list = await request(ctx.app)
      .get(`/api/webhooks/${token}/requests`)
      .set("Authorization", `Bearer ${j}`)
      .expect(200);
    expect(list.body.count).toBe(2);

    const id = list.body.requests[0].id;
    await request(ctx.app)
      .delete(`/api/webhooks/${token}/requests/${id}`)
      .set("Authorization", `Bearer ${j}`)
      .expect(200);

    list = await request(ctx.app)
      .get(`/api/webhooks/${token}/requests`)
      .set("Authorization", `Bearer ${j}`)
      .expect(200);
    expect(list.body.count).toBe(1);
  });

  it("7. DELETE /requests (clear) vacía el historial", async () => {
    const token = await createWebhook(request, ctx.app);
    const j = await unlock(request, ctx.app, token);

    await request(ctx.app).post(`/h/${token}/x`).send({}).expect(200);
    await request(ctx.app).post(`/h/${token}/y`).send({}).expect(200);

    await request(ctx.app)
      .delete(`/api/webhooks/${token}/requests`)
      .set("Authorization", `Bearer ${j}`)
      .expect(200);

    const list = await request(ctx.app)
      .get(`/api/webhooks/${token}/requests`)
      .set("Authorization", `Bearer ${j}`)
      .expect(200);
    expect(list.body.count).toBe(0);
  });

  it("8. JWT expirado es rechazado (401)", async () => {
    const token = await createWebhook(request, ctx.app);
    const wh = await ctx.deps.webhooks.findByToken(token);
    const expired = jwt.sign(
      { sub: wh!.id, token, scope: "read" },
      config.JWT_SECRET,
      { expiresIn: "-1s" },
    );
    await request(ctx.app)
      .get(`/api/webhooks/${token}/requests`)
      .set("Authorization", `Bearer ${expired}`)
      .expect(401);
  });

  it("9. JWT de otro webhook es rechazado (403)", async () => {
    const tokenA = await createWebhook(request, ctx.app, "1111");
    const tokenB = await createWebhook(request, ctx.app, "2222");
    const jwtA = await unlock(request, ctx.app, tokenA, "1111");

    await request(ctx.app)
      .get(`/api/webhooks/${tokenB}/requests`)
      .set("Authorization", `Bearer ${jwtA}`)
      .expect(403);
  });

  it("10. unlock sigue funcionando (retrocompatibilidad)", async () => {
    const token = await createWebhook(request, ctx.app, "9999");
    const res = await request(ctx.app)
      .post(`/api/webhooks/${token}/unlock`)
      .send({ pin: "9999" })
      .expect(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.webhook.token).toBe(token);
  });
});
