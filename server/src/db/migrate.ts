import type { Knex } from "knex";
import * as init from "./migrations/0001_init.js";
import * as demo from "./migrations/0005_demo.js";

interface Migration {
  name: string;
  up: (knex: Knex) => Promise<void>;
  down: (knex: Knex) => Promise<void>;
}

const migrations: Migration[] = [init, demo];

const migrationSource: Knex.MigrationSource<Migration> = {
  async getMigrations() {
    return migrations;
  },
  getMigrationName(migration) {
    return migration.name;
  },
  async getMigration(migration) {
    return {
      up: migration.up,
      down: migration.down,
    };
  },
};

export async function runMigrations(knex: Knex): Promise<void> {
  await knex.migrate.latest({ migrationSource });
}

export async function rollbackMigrations(knex: Knex): Promise<void> {
  await knex.migrate.rollback({ migrationSource }, true);
}
