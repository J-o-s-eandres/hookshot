import type { CapturedRequest } from "./types.js";

/** Cliente HTTP del CLI contra la API de HookShot. */

export class CliError extends Error {}

/** Crea un webhook nuevo y devuelve el token + URL de ingesta. */
export async function createWebhook(
  server: string,
  input: { name?: string; pin: string },
): Promise<{ token: string; name: string | null; ingestUrl: string }> {
  let res: Response;
  try {
    res = await fetch(`${server}/api/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: input.name ?? undefined, pin: input.pin }),
    });
  } catch {
    throw new CliError(`No se pudo conectar con HookShot en ${server}`);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = (data as Record<string, unknown>).message ?? `Error de validación: HTTP ${res.status}`;
    throw new CliError(String(msg));
  }
  const data = (await res.json()) as {
    webhook?: { token: string; name: string | null };
  };
  if (!data.webhook?.token) throw new CliError("Respuesta de creación inesperada.");
  return {
    token: data.webhook.token,
    name: data.webhook.name ?? null,
    ingestUrl: `${server}/h/${data.webhook.token}`,
  };
}

/** Valida el PIN y devuelve un JWT de lectura. */
export async function unlock(
  server: string,
  token: string,
  pin: string,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${server}/api/webhooks/${token}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
  } catch {
    throw new CliError(`No se pudo conectar con HookShot en ${server}`);
  }
  if (res.status === 401) throw new CliError("PIN incorrecto.");
  if (res.status === 404)
    throw new CliError("Webhook no encontrado (token inválido).");
  if (!res.ok) throw new CliError(`Error de unlock: HTTP ${res.status}`);
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new CliError("Respuesta de unlock inesperada.");
  return data.token;
}

/** Obtiene las últimas N peticiones del historial. */
export async function fetchHistory(
  server: string,
  token: string,
  jwt: string,
  limit: number,
): Promise<CapturedRequest[]> {
  const url = `${server}/api/webhooks/${token}/requests?limit=${limit}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) throw new CliError(`No se pudo obtener el historial: HTTP ${res.status}`);
  const data = (await res.json()) as { requests?: CapturedRequest[] };
  return data.requests ?? [];
}

/** Abre el stream SSE del webhook. Devuelve la Response (con body legible). */
export async function openStream(
  server: string,
  token: string,
  jwt: string,
): Promise<Response> {
  const url = `${server}/api/webhooks/${token}/stream?token=${encodeURIComponent(jwt)}`;
  const res = await fetch(url, { headers: { Accept: "text/event-stream" } });
  if (!res.ok || !res.body) {
    throw new CliError(`No se pudo abrir el stream: HTTP ${res.status}`);
  }
  return res;
}
