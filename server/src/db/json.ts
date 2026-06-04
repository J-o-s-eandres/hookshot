/**
 * Utilidades para columnas JSON que se comporten igual en SQLite y PostgreSQL.
 *
 * Divergencia clave entre motores:
 *  - SQLite guarda/devuelve las columnas `.json()` como TEXTO crudo.
 *  - node-pg PARSEA automáticamente las columnas json/jsonb al leerlas.
 *
 * Para escribir, serializamos siempre a string (válido en ambos).
 * Para leer, `parseJson` tolera ambos casos (string u objeto ya parseado).
 */

/** Serializa un valor para guardarlo en una columna JSON. `null`/`undefined` → null. */
export function toJsonColumn(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

/** Lee una columna JSON tolerando string (sqlite) u objeto ya parseado (pg). */
export function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    if (value.length === 0) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  // pg ya devolvió un objeto/array.
  return value as T;
}
