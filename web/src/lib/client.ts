/**
 * Cliente HTTP de la API.
 *
 * Envuelve `fetch` para:
 *  - inyectar `Authorization: Bearer <jwt>` cuando se pasa un token,
 *  - parsear JSON y lanzar un `ApiError` legible en respuestas no-2xx,
 *  - notificar al consumidor cuando un 401 invalida la sesión.
 */
import type {
  CapturedRequest,
  PublicWebhook,
  ResponseConfig,
  SafeWebhook,
} from "../types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const res = await fetch(`/api${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  // 204 sin cuerpo.
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ?? `Error ${res.status}`;
    throw new ApiError(res.status, message, (data as { details?: unknown })?.details);
  }
  return data as T;
}

/** API tipada de HookShot. */
export const api = {
  createWebhook(input: { name?: string; pin: string }) {
    return request<{ token: string; webhook: SafeWebhook }>("/webhooks", {
      method: "POST",
      body: input,
    });
  },

  getPublicWebhook(token: string) {
    return request<{ webhook: PublicWebhook }>(`/webhooks/${token}`);
  },

  unlock(token: string, pin: string) {
    return request<{ token: string; webhook: SafeWebhook }>(
      `/webhooks/${token}/unlock`,
      { method: "POST", body: { pin } },
    );
  },

  updateResponse(token: string, jwt: string, response: ResponseConfig) {
    return request<{ webhook: SafeWebhook }>(`/webhooks/${token}/response`, {
      method: "PATCH",
      body: response,
      token: jwt,
    });
  },

  listRequests(token: string, jwt: string, params?: { limit?: number; before?: string; q?: string; method?: string }) {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.before) qs.set("before", params.before);
    if (params?.q) qs.set("q", params.q);
    if (params?.method) qs.set("method", params.method);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ webhook: SafeWebhook; requests: CapturedRequest[]; count: number }>(
      `/webhooks/${token}/requests${suffix}`,
      { token: jwt },
    );
  },

  deleteRequest(token: string, jwt: string, id: string) {
    return request<{ deleted: number }>(`/webhooks/${token}/requests/${id}`, {
      method: "DELETE",
      token: jwt,
    });
  },

  renameWebhook(token: string, jwt: string, name: string) {
    return request<{ webhook: SafeWebhook }>(`/webhooks/${token}`, {
      method: "PATCH",
      body: { name },
      token: jwt,
    });
  },

  deleteWebhook(token: string, jwt: string) {
    return request<{ deleted: boolean }>(`/webhooks/${token}`, {
      method: "DELETE",
      token: jwt,
    });
  },

  clearRequests(token: string, jwt: string) {
    return request<{ cleared: number }>(`/webhooks/${token}/requests`, {
      method: "DELETE",
      token: jwt,
    });
  },

};
