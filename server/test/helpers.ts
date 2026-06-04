/**
 * Utilidades compartidas por los tests.
 *
 * Cada test arranca una app aislada con SQLite EN MEMORIA (pool de 1 conexión
 * para que la base persista entre queries), corre las migraciones y devuelve
 * la app de Express lista para Supertest.
 */
import knexFactory, { type Knex } from "knex";
import type { Express } from "express";
import { buildDeps, type AppDeps } from "../src/deps.js";
import { createApp } from "../src/app.js";
import { runMigrations } from "../src/db/migrate.js";

export interface TestContext {
  app: Express;
  knex: Knex;
  deps: AppDeps;
}

export async function makeTestApp(): Promise<TestContext> {
  const knex = knexFactory({
    client: "better-sqlite3",
    connection: { filename: ":memory:" },
    useNullAsDefault: true,
    // SQLite en memoria: una sola conexión para no perder los datos.
    pool: { min: 1, max: 1 },
  });
  await runMigrations(knex);
  const deps = buildDeps(knex);
  const app = createApp(deps);
  return { app, knex, deps };
}

/** Crea un webhook vía API y devuelve su token. */
export async function createWebhook(
  request: typeof import("supertest").default,
  app: Express,
  pin = "1234",
): Promise<string> {
  const res = await request(app)
    .post("/api/webhooks")
    .send({ name: "test", pin })
    .expect(201);
  return res.body.webhook.token as string;
}

/** Valida el PIN y devuelve un JWT de lectura. */
export async function unlock(
  request: typeof import("supertest").default,
  app: Express,
  token: string,
  pin = "1234",
): Promise<string> {
  const res = await request(app)
    .post(`/api/webhooks/${token}/unlock`)
    .send({ pin })
    .expect(200);
  return res.body.token as string;
}
