/**
 * CLI de migraciones. Aplica las migraciones pendientes y termina.
 * Uso (dev):  npm -w server run migrate
 * Uso (prod): node dist/db/migrate-cli.js
 */
import { db } from "./knex.js";
import { runMigrations } from "./migrate.js";

runMigrations(db)
  .then(() => {
    console.log("[migrate] migraciones aplicadas.");
    return db.destroy();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[migrate] error:", err);
    process.exit(1);
  });
