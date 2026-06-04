/**
 * Repositorio de peticiones capturadas.
 *
 * Maneja inserción, listado paginado, borrado y purga por retención.
 */
import { nanoid } from "nanoid";
import type { Knex } from "knex";
import { parseJson, toJsonColumn } from "./json.js";

/** Datos de una petición capturada, ya parseados a dominio. */
export interface CapturedRequest {
  id: string;
  webhookId: string;
  method: string;
  path: string;
  query: Record<string, unknown>;
  headers: Record<string, string>;
  body: string;
  contentType: string | null;
  size: number;
  ip: string | null;
  createdAt: string;
}

/** Lo que produce la captura (sin id ni fecha; los pone el repo). */
export interface NewCapturedRequest {
  webhookId: string;
  method: string;
  path: string;
  query: Record<string, unknown>;
  headers: Record<string, string>;
  body: string;
  contentType: string | null;
  size: number;
  ip: string | null;
}

interface RequestRow {
  id: string;
  webhook_id: string;
  method: string;
  path: string;
  query: unknown;
  headers: unknown;
  body: string | null;
  content_type: string | null;
  size: number;
  ip: string | null;
  created_at: string;
}

function rowToRequest(row: RequestRow): CapturedRequest {
  return {
    id: row.id,
    webhookId: row.webhook_id,
    method: row.method,
    path: row.path,
    query: parseJson<Record<string, unknown>>(row.query, {}),
    headers: parseJson<Record<string, string>>(row.headers, {}),
    body: row.body ?? "",
    contentType: row.content_type,
    size: row.size,
    ip: row.ip,
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date(row.created_at).toISOString(),
  };
}

export interface ListOptions {
  /** Máximo de filas a devolver (default 50, tope 200). */
  limit?: number;
  /** Cursor: devolver solo peticiones creadas antes de este ISO timestamp. */
  before?: string;
  /** Búsqueda textual sobre method y path. */
  q?: string;
  /** Filtrar por método HTTP exacto (GET, POST, PUT, PATCH, DELETE). */
  method?: string;
}

export class RequestsRepo {
  constructor(private readonly knex: Knex) {}

  /** Inserta una petición capturada y devuelve la entidad de dominio. */
  async insert(input: NewCapturedRequest): Promise<CapturedRequest> {
    const row: RequestRow = {
      id: nanoid(),
      webhook_id: input.webhookId,
      method: input.method,
      path: input.path,
      query: toJsonColumn(input.query),
      headers: toJsonColumn(input.headers),
      body: input.body,
      content_type: input.contentType,
      size: input.size,
      ip: input.ip,
      created_at: new Date().toISOString(),
    };
    await this.knex("requests").insert(row);
    return rowToRequest(row);
  }

  /** Lista las peticiones de un webhook, más recientes primero (paginado por cursor). */
  async listByWebhook(
    webhookId: string,
    opts: ListOptions = {},
  ): Promise<CapturedRequest[]> {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    let q = this.knex<RequestRow>("requests")
      .where({ webhook_id: webhookId })
      .orderBy("created_at", "desc")
      .limit(limit);

    if (opts.before) {
      q = q.andWhere("created_at", "<", opts.before);
    }

    if (opts.method) {
      q = q.andWhere("method", "=", opts.method.toUpperCase());
    }

    if (opts.q) {
      const pattern = `%${opts.q}%`;
      q = q.andWhere(function () {
        this.whereILike("method", pattern).orWhereILike("path", pattern);
      });
    }

    const rows = await q;
    return rows.map(rowToRequest);
  }

  async findById(
    webhookId: string,
    id: string,
  ): Promise<CapturedRequest | null> {
    const row = await this.knex<RequestRow>("requests")
      .where({ webhook_id: webhookId, id })
      .first();
    return row ? rowToRequest(row) : null;
  }

  /** Borra una petición concreta. Devuelve cuántas filas se afectaron. */
  async deleteOne(webhookId: string, id: string): Promise<number> {
    return this.knex("requests").where({ webhook_id: webhookId, id }).del();
  }

  /** Borra TODAS las peticiones de un webhook. Devuelve el conteo borrado. */
  async clear(webhookId: string): Promise<number> {
    return this.knex("requests").where({ webhook_id: webhookId }).del();
  }

  /** Cuenta las peticiones de un webhook (para mostrar totales en la UI). */
  async countByWebhook(webhookId: string): Promise<number> {
    const result = await this.knex("requests")
      .where({ webhook_id: webhookId })
      .count<{ c: number | string }[]>({ c: "*" });
    return Number(result[0]?.c ?? 0);
  }

  /** Cuenta y última fecha de peticiones desde `sinceIso` (para health). */
  async statsSince(
    webhookId: string,
    sinceIso: string,
  ): Promise<{ count: number; lastAt: string | null }> {
    const row = await this.knex("requests")
      .where({ webhook_id: webhookId })
      .andWhere("created_at", ">=", sinceIso)
      .select(
        this.knex.raw("count(*) as c"),
        this.knex.raw("max(created_at) as last"),
      )
      .first<{ c: number | string; last: string | null }>();
    return { count: Number(row?.c ?? 0), lastAt: row?.last ?? null };
  }

  /** Purga peticiones más antiguas que `days` días. Devuelve cuántas borró. */
  async purgeOlderThan(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString();
    return this.knex("requests").where("created_at", "<", cutoff).del();
  }
}
