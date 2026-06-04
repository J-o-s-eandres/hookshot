/**
 * Construcción de la instancia de Knex.
 *
 * El mismo código sirve para SQLite (dev) y PostgreSQL (prod): solo cambia
 * la configuración derivada de `config.DB_CLIENT`. El resto de la app usa
 * la instancia exportada sin saber qué motor hay debajo.
 */
import knexFactory, { type Knex } from "knex";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

/**
 * Devuelve la configuración de conexión adecuada según el cliente elegido.
 */
export function buildKnexConfig(): Knex.Config {
  if (config.DB_CLIENT === "pg") {
    return {
      client: "pg",
      connection: config.DATABASE_URL,
      pool: { min: 2, max: 10 },
    };
  }

  // SQLite: aseguramos que exista la carpeta del archivo.
  const file = config.SQLITE_FILE;
  const dir = path.dirname(file);
  if (dir && dir !== "." && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return {
    client: "better-sqlite3",
    connection: { filename: file },
    // SQLite no soporta DEFAULT en columnas añadidas igual que SQL estándar;
    // esta opción evita que Knex inserte `default null` problemáticos.
    useNullAsDefault: true,
  };
}

/**
 * Crea una instancia de Knex nueva. Útil en tests (DB en memoria por test).
 * En producción usamos el singleton `db` de abajo.
 */
export function createKnex(overrides?: Knex.Config): Knex {
  return knexFactory({ ...buildKnexConfig(), ...overrides });
}

/** Instancia compartida para la app en ejecución. */
export const db: Knex = createKnex();

export type { Knex };
