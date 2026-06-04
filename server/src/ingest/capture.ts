/**
 * Captura pura de una petición entrante.
 *
 * Toma el `Request` de Express (con el body ya leído como Buffer por el parser
 * `raw` de la ruta de ingesta) y lo convierte en un `NewCapturedRequest`.
 * Es una función sin efectos secundarios para poder testearla aislada.
 */
import type { Request } from "express";
import type { NewCapturedRequest } from "../db/requests.repo.js";

/** Normaliza las cabeceras de Node (string | string[]) a Record<string,string>. */
function normalizeHeaders(
  raw: NodeJS.Dict<string | string[]>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    out[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  return out;
}

/** Normaliza el query (puede traer arrays) a Record<string, unknown>. */
function normalizeQuery(query: unknown): Record<string, unknown> {
  if (query && typeof query === "object") {
    return query as Record<string, unknown>;
  }
  return {};
}

/** Determina la IP real respetando `X-Forwarded-For` (primer salto). */
function clientIp(req: Request): string | null {
  const xff = req.header("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? req.socket.remoteAddress ?? null;
}

/**
 * Construye el registro de captura.
 * @param req      la petición entrante
 * @param webhookId id interno del webhook destino
 */
export function captureRequest(
  req: Request,
  webhookId: string,
): NewCapturedRequest {
  // El parser `raw` deja un Buffer en req.body; si no hubo body, es {} o vacío.
  const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const body = bodyBuffer.toString("utf8");

  // Subpath tras el token (Express deja el comodín en params[0]).
  const wildcard = (req.params as Record<string, string>)[0] ?? "";
  const path = wildcard ? `/${wildcard}` : "/";

  return {
    webhookId,
    method: req.method,
    path,
    query: normalizeQuery(req.query),
    headers: normalizeHeaders(req.headers),
    body,
    contentType: req.header("content-type") ?? null,
    size: bodyBuffer.byteLength,
    ip: clientIp(req),
  };
}
