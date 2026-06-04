/**
 * Handler de ingesta: el corazón de HookShot.
 *
 * Para cualquier método/URL bajo `/h/:token`:
 *  1. localiza el webhook por su token (404 si no existe),
 *  2. captura y persiste la petición,
 *  3. la difunde en vivo por SSE a quien esté mirando,
 *  4. responde al emisor con la respuesta personalizada del webhook.
 *
 * Es una fábrica que recibe sus dependencias (repos, hub) para facilitar
 * los tests y evitar singletons ocultos.
 */
import type { RequestHandler } from "express";
import type { WebhooksRepo } from "../db/webhooks.repo.js";
import type { RequestsRepo } from "../db/requests.repo.js";
import type { SseHub } from "../sse/hub.js";
import { captureRequest } from "./capture.js";

export interface IngestDeps {
  webhooks: WebhooksRepo;
  requests: RequestsRepo;
  hub: SseHub;
}

export function createIngestHandler(deps: IngestDeps): RequestHandler {
  return async (req, res, next) => {
    try {
      // El comodín de la ruta garantiza `token`; default defensivo para el tipo.
      const token = req.params.token ?? "";
      const webhook = await deps.webhooks.findByToken(token);

      if (!webhook) {
        res
          .status(404)
          .json({ error: "No existe ningún webhook con ese token." });
        return;
      }

      // Captura + persistencia.
      const captured = captureRequest(req, webhook.id);
      const saved = await deps.requests.insert(captured);

      // Difusión en vivo (no bloquea la respuesta al emisor).
      deps.hub.broadcast(token, "request", saved);

      // Respuesta personalizada configurada en el webhook.
      const { status, contentType, headers, body } = webhook.response;
      res.status(status);
      res.setHeader("Content-Type", contentType);
      for (const [key, value] of Object.entries(headers)) {
        // No permitimos sobreescribir cabeceras de control de la conexión.
        if (/^(content-length|transfer-encoding|connection)$/i.test(key)) {
          continue;
        }
        res.setHeader(key, value);
      }
      res.send(body);
    } catch (err) {
      next(err);
    }
  };
}
