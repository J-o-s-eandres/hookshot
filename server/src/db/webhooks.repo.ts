import { nanoid } from "nanoid";
import type { Knex } from "knex";
import { parseJson, toJsonColumn } from "./json.js";

export interface ResponseConfig {
  status: number;
  contentType: string;
  headers: Record<string, string>;
  body: string;
}

export interface Webhook {
  id: string;
  token: string;
  name: string | null;
  pinHash: string;
  response: ResponseConfig;
  createdAt: string;
  expiresAt: string | null;
}

interface WebhookRow {
  id: string;
  token: string;
  name: string | null;
  pin_hash: string;
  resp_status: number;
  resp_content_type: string;
  resp_headers: unknown;
  resp_body: string | null;
  created_at: string;
  expires_at: string | null;
}

function rowToWebhook(row: WebhookRow): Webhook {
  return {
    id: row.id,
    token: row.token,
    name: row.name,
    pinHash: row.pin_hash,
    response: {
      status: row.resp_status,
      contentType: row.resp_content_type,
      headers: parseJson<Record<string, string>>(row.resp_headers, {}),
      body: row.resp_body ?? "",
    },
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date(row.created_at).toISOString(),
    expiresAt: row.expires_at ?? null,
  };
}

export interface CreateWebhookInput {
  name?: string | null;
  pinHash: string;
  expiresAt?: string;
}

export class WebhooksRepo {
  constructor(private readonly knex: Knex) {}

  async create(input: CreateWebhookInput): Promise<Webhook> {
    const row: WebhookRow = {
      id: nanoid(),
      token: nanoid(12),
      name: input.name ?? null,
      pin_hash: input.pinHash,
      resp_status: 200,
      resp_content_type: "application/json",
      resp_headers: toJsonColumn({}),
      resp_body: JSON.stringify({ ok: true, message: "Captured by HookShot" }),
      created_at: new Date().toISOString(),
      expires_at: input.expiresAt ?? null,
    };
    await this.knex("webhooks").insert(row);
    return rowToWebhook(row);
  }

  async findByToken(token: string): Promise<Webhook | null> {
    const row = await this.knex<WebhookRow>("webhooks")
      .where({ token })
      .first();
    return row ? rowToWebhook(row) : null;
  }

  async findById(id: string): Promise<Webhook | null> {
    const row = await this.knex<WebhookRow>("webhooks").where({ id }).first();
    return row ? rowToWebhook(row) : null;
  }

  async updateResponse(
    token: string,
    response: ResponseConfig,
  ): Promise<Webhook | null> {
    await this.knex("webhooks")
      .where({ token })
      .update({
        resp_status: response.status,
        resp_content_type: response.contentType,
        resp_headers: toJsonColumn(response.headers),
        resp_body: response.body,
      });
    return this.findByToken(token);
  }

  async update(token: string, input: { name?: string | null }): Promise<Webhook | null> {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (Object.keys(data).length === 0) return this.findByToken(token);
    await this.knex("webhooks").where({ token }).update(data);
    return this.findByToken(token);
  }

  async delete(token: string): Promise<boolean> {
    const deleted = await this.knex("webhooks").where({ token }).del();
    return deleted > 0;
  }

  async findExpired(): Promise<Webhook[]> {
    const rows = await this.knex<WebhookRow>("webhooks")
      .where("expires_at", "<=", new Date().toISOString())
      .andWhereNotNull("expires_at");
    return rows.map(rowToWebhook);
  }

  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const deleted = await this.knex("webhooks").whereIn("id", ids).del();
    return deleted;
  }

  async protect(token: string, pinHash: string): Promise<void> {
    await this.knex("webhooks")
      .where({ token })
      .update({ pin_hash: pinHash });
  }
}
