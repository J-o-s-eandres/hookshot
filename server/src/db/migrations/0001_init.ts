/**
 * Migración inicial: tablas `webhooks` y `requests`.
 *
 * Usamos tipos de columna portables entre SQLite y PostgreSQL:
 *  - `uuid` lo modelamos como `string` (texto) para no depender de la
 *    extensión pgcrypto; los ids los generamos en la app (nanoid/uuid).
 *  - los campos JSON usan `.json()` (TEXT en SQLite, JSONB-compatible en pg).
 *  - los timestamps usan `.timestamp()` con default a `now()`.
 */
import type { Knex } from "knex";

export const name = "0001_init";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("webhooks", (t) => {
    t.string("id").primary();
    t.string("token").notNullable().unique();
    t.string("name").nullable();
    t.string("pin_hash").notNullable();

    // Configuración de la respuesta personalizada que devuelve la ingesta.
    t.integer("resp_status").notNullable().defaultTo(200);
    t.string("resp_content_type").notNullable().defaultTo("application/json");
    t.json("resp_headers").nullable();
    t.text("resp_body").nullable();

    t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("requests", (t) => {
    t.string("id").primary();
    t.string("webhook_id")
      .notNullable()
      .references("id")
      .inTable("webhooks")
      .onDelete("CASCADE");

    t.string("method").notNullable();
    t.string("path").notNullable().defaultTo("");
    t.json("query").nullable();
    t.json("headers").nullable();
    t.text("body").nullable();
    t.string("content_type").nullable();
    t.integer("size").notNullable().defaultTo(0);
    t.string("ip").nullable();

    t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    // Índice para listar el historial de un webhook por fecha descendente.
    t.index(["webhook_id", "created_at"], "idx_requests_webhook_created");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("requests");
  await knex.schema.dropTableIfExists("webhooks");
}
