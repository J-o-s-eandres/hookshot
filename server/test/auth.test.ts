import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { config } from "../src/config.js";
import { makeTestApp, createWebhook, unlock, type TestContext } from "./helpers.js";

describe("autenticación PIN + JWT", () => {
  let ctx: TestContext;
  beforeEach(async () => {
    ctx = await makeTestApp();
  });

  it("devuelve un JWT al crear el webhook (auto-unlock)", async () => {
    const res = await request(ctx.app)
      .post("/api/webhooks")
      .send({ name: "auto", pin: "9876" })
      .expect(201);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.webhook.token).toBeDefined();
    // El JWT debe funcionar para listar requests.
    await request(ctx.app)
      .get(`/api/webhooks/${res.body.webhook.token}/requests`)
      .set("Authorization", `Bearer ${res.body.token}`)
      .expect(200);
  });

  it("rechaza el unlock con PIN incorrecto", async () => {
    const token = await createWebhook(request, ctx.app, "1234");
    await request(ctx.app)
      .post(`/api/webhooks/${token}/unlock`)
      .send({ pin: "9999" })
      .expect(401);
  });

  it("emite un JWT válido con el PIN correcto", async () => {
    const token = await createWebhook(request, ctx.app, "4321");
    const res = await request(ctx.app)
      .post(`/api/webhooks/${token}/unlock`)
      .send({ pin: "4321" })
      .expect(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.webhook.token).toBe(token);
  });

  it("rechaza listar sin JWT (401)", async () => {
    const token = await createWebhook(request, ctx.app);
    await request(ctx.app)
      .get(`/api/webhooks/${token}/requests`)
      .expect(401);
  });

  it("rechaza un JWT de OTRO webhook (403)", async () => {
    const tokenA = await createWebhook(request, ctx.app, "1111");
    const tokenB = await createWebhook(request, ctx.app, "2222");
    const jwtA = await unlock(request, ctx.app, tokenA, "1111");

    // Usamos el JWT de A contra el webhook B.
    await request(ctx.app)
      .get(`/api/webhooks/${tokenB}/requests`)
      .set("Authorization", `Bearer ${jwtA}`)
      .expect(403);
  });

  it("rechaza un JWT expirado (401)", async () => {
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
});
