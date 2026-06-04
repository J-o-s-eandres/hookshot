/**
 * Ruta de streaming SSE en vivo de un webhook.
 *
 *  GET /api/webhooks/:token/stream?token=<jwt>
 *
 * `EventSource` del navegador no permite cabeceras personalizadas, por eso el
 * JWT viaja en el query string. El middleware de auth ya soporta ese caso.
 */
import { Router } from "express";
import type { AppDeps } from "../deps.js";
import { requireWebhookAuth } from "../auth/middleware.js";

export function sseRouter(deps: AppDeps): Router {
  const router = Router({ mergeParams: true });

  router.get(
    "/:token/stream",
    requireWebhookAuth(deps.webhooks),
    (req, res) => {
      // El middleware ya validó el JWT y cargó el webhook en req.webhook.
      deps.hub.subscribe(req.webhook!.token, res);
      // No cerramos `res`: la conexión queda abierta para el streaming.
    },
  );

  return router;
}
