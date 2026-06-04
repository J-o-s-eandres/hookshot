import type { Knex } from "knex";

export const name = "0006_session";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("webhooks", (t) => {
    t.string("session_id").nullable().index();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("webhooks", (t) => {
    t.dropColumn("session_id");
  });
}
