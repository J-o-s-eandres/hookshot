/**
 * Rutas del historial de peticiones de un webhook. TODAS requieren JWT.
 * Se montan bajo `/api/webhooks/:token` con `mergeParams` para heredar `:token`.
 *
 *  GET    /requests            listar (paginado por cursor `before`)
 *  GET    /requests/:id        detalle de una petición
 *  DELETE /requests/:id        borrar una
 *  DELETE /requests            limpiar todas
 */
import { Router } from "express";
import { z } from "zod";
import type { AppDeps } from "../deps.js";
import { ApiError, asyncHandler } from "./errors.js";
import { requireWebhookAuth } from "../auth/middleware.js";
import { toSafeWebhook } from "./serializers.js";

const httpMethod = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  before: z.string().datetime().optional(),
  q: z.string().max(100).optional(),
  method: httpMethod,
});

export function requestsRouter(deps: AppDeps): Router {
  // mergeParams: true → `:token` de la ruta padre está disponible aquí.
  const router = Router({ mergeParams: true });
  router.use(requireWebhookAuth(deps.webhooks));

  // Listar peticiones del webhook autenticado.
  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const webhook = req.webhook!; // garantizado por el middleware de auth
      const { limit, before, q, method } = listQuerySchema.parse(req.query);
      const [requests, count] = await Promise.all([
        deps.requests.listByWebhook(webhook.id, { limit, before, q, method }),
        deps.requests.countByWebhook(webhook.id),
      ]);
      // Incluimos el webhook (seguro) para que la UI tenga su config de
      // respuesta al recargar, sin un endpoint extra.
      res.json({ webhook: toSafeWebhook(webhook), requests, count });
    }),
  );

  // Detalle de una petición concreta.
  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const webhook = req.webhook!;
      const request = await deps.requests.findById(webhook.id, req.params.id ?? "");
      if (!request) throw new ApiError(404, "Petición no encontrada.");
      res.json({ request });
    }),
  );

  // Borrar una petición.
  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const webhook = req.webhook!;
      const deleted = await deps.requests.deleteOne(webhook.id, req.params.id ?? "");
      if (deleted === 0) throw new ApiError(404, "Petición no encontrada.");
      res.json({ deleted });
    }),
  );

  // Limpiar todo el historial del webhook.
  router.delete(
    "/",
    asyncHandler(async (req, res) => {
      const webhook = req.webhook!;
      const cleared = await deps.requests.clear(webhook.id);
      res.json({ cleared });
    }),
  );

  return router;
}
