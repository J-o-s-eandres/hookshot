import type { NextFunction, Request, RequestHandler, Response } from "express";
import { verifyWebhookToken, type WebhookTokenPayload } from "./jwt.js";
import type { Webhook, WebhooksRepo } from "../db/webhooks.repo.js";
import { ApiError } from "../api/errors.js";

declare module "express-serve-static-core" {
  interface Request {
    auth?: WebhookTokenPayload;
    webhook?: Webhook;
  }
}

function extractToken(req: Request): string | null {
  const header = req.header("authorization");
  if (header && header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  const q = req.query.token;
  if (typeof q === "string" && q.length > 0) return q;
  return null;
}

export function requireWebhookAuth(repo: WebhooksRepo): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const routeToken = req.params.token;
      if (!routeToken) throw new ApiError(404, "Webhook no encontrado.");

      const webhook = await repo.findByToken(routeToken);
      if (!webhook) throw new ApiError(404, "Webhook no encontrado.");

      if (webhook.expiresAt) {
        req.webhook = webhook;
        next();
        return;
      }

      const raw = extractToken(req);
      if (!raw) {
        throw new ApiError(401, "Falta el token de autenticación.");
      }

      let payload: WebhookTokenPayload;
      try {
        payload = verifyWebhookToken(raw);
      } catch {
        throw new ApiError(401, "Token inválido o expirado.");
      }

      if (payload.scope !== "read") {
        throw new ApiError(401, "Scope inválido.");
      }

      if (payload.token !== routeToken) {
        throw new ApiError(403, "El token no corresponde a este webhook.");
      }

      req.auth = payload;
      req.webhook = webhook;
      next();
    } catch (err) {
      next(err);
    }
  };
}
