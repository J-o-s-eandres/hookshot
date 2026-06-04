/**
 * Migración: columna `expires_at` en `webhooks` para expirar webhooks
 * creados en modo demo (sin PIN). Si es NULL, el webhook no expira.
 */
import type { Knex } from "knex";

export const name = "0005_demo";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("webhooks", (t) => {
    t.timestamp("expires_at").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("webhooks", (t) => {
    t.dropColumn("expires_at");
  });
}
