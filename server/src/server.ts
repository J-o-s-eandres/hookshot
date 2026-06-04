import { config } from "./config.js";
import { db } from "./db/knex.js";
import { runMigrations } from "./db/migrate.js";
import { buildDeps } from "./deps.js";
import { createApp } from "./app.js";
import { startCleanup } from "./cleanup/job.js";

async function main(): Promise<void> {
  await runMigrations(db);

  const deps = buildDeps(db);
  const cleanup = startCleanup(deps.requests, deps.webhooks, config.RETENTION_DAYS);
  const app = createApp(deps);

  const server = app.listen(config.PORT, () => {
    console.log(`HookShot escuchando en http://localhost:${config.PORT}`);
    console.log(`  · DB: ${config.DB_CLIENT}`);
    console.log(`  · Retención: ${config.RETENTION_DAYS} días`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n${signal} recibido, cerrando…`);
    cleanup.stop();
    server.close(() => {
      void db.destroy().finally(() => process.exit(0));
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Fallo al arrancar HookShot:", err);
  process.exit(1);
});
