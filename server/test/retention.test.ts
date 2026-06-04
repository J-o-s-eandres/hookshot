import { describe, it, expect, beforeEach } from "vitest";
import { makeTestApp, type TestContext } from "./helpers.js";
import { hashPin } from "../src/auth/pin.js";

describe("retención / purga por tiempo", () => {
  let ctx: TestContext;
  beforeEach(async () => {
    ctx = await makeTestApp();
  });

  it("purga peticiones más viejas que N días y conserva las nuevas", async () => {
    const webhook = await ctx.deps.webhooks.create({
      name: null,
      pinHash: await hashPin("1234"),
    });

    // Una petición reciente y otra que vamos a "envejecer".
    const recent = await ctx.deps.requests.insert({
      webhookId: webhook.id,
      method: "POST",
      path: "/",
      query: {},
      headers: {},
      body: "reciente",
      contentType: "text/plain",
      size: 8,
      ip: null,
    });
    const old = await ctx.deps.requests.insert({
      webhookId: webhook.id,
      method: "POST",
      path: "/",
      query: {},
      headers: {},
      body: "vieja",
      contentType: "text/plain",
      size: 5,
      ip: null,
    });

    // Forzamos created_at de la vieja a hace 30 días.
    const longAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await ctx.knex("requests").where({ id: old.id }).update({ created_at: longAgo });

    const removed = await ctx.deps.requests.purgeOlderThan(7);
    expect(removed).toBe(1);

    const remaining = await ctx.deps.requests.listByWebhook(webhook.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe(recent.id);
  });
});
