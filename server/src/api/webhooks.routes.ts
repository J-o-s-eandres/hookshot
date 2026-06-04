import { Router } from "express";
import { z } from "zod";
import type { AppDeps } from "../deps.js";
import { ApiError, asyncHandler } from "./errors.js";
import { hashPin, isValidPinFormat, verifyPin } from "../auth/pin.js";
import { signWebhookToken } from "../auth/jwt.js";
import { requireWebhookAuth } from "../auth/middleware.js";
import { toPublicWebhook, toSafeWebhook } from "./serializers.js";
import { config } from "../config.js";

const createSchema = z.object({
  name: z.string().trim().max(80).optional(),
  pin: z.string().refine(isValidPinFormat, "El PIN debe tener 4 a 8 dígitos.").optional(),
});

const unlockSchema = z.object({
  pin: z.string().min(1, "PIN requerido."),
});

const responseSchema = z.object({
  status: z.number().int().min(100).max(599),
  contentType: z.string().min(1).max(150),
  headers: z.record(z.string(), z.string()).default({}),
  body: z.string().max(1_000_000).default(""),
});

export function webhooksRouter(deps: AppDeps): Router {
  const router = Router();
  const auth = requireWebhookAuth(deps.webhooks);

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const { name, pin } = createSchema.parse(req.body);

      if (!pin && !config.demoMode) {
        throw new ApiError(400, "PIN requerido. 4 a 8 dígitos.");
      }

      const pinHash = pin ? await hashPin(pin) : "";
      const expiresAt =
        !pin && config.demoMode
          ? new Date(Date.now() + config.demoTtlMinutes * 60_000).toISOString()
          : undefined;

      const webhook = await deps.webhooks.create({ name: name ?? null, pinHash, expiresAt });

      const jwt = signWebhookToken({
        webhookId: webhook.id,
        token: webhook.token,
      });
      res.status(201).json({ token: jwt, webhook: toSafeWebhook(webhook) });
    }),
  );

  router.get(
    "/:token",
    asyncHandler(async (req, res) => {
      const webhook = await deps.webhooks.findByToken(req.params.token ?? "");
      if (!webhook) throw new ApiError(404, "Webhook no encontrado.");
      res.json({ webhook: toPublicWebhook(webhook) });
    }),
  );

  router.post(
    "/:token/unlock",
    asyncHandler(async (req, res) => {
      const { pin } = unlockSchema.parse(req.body);
      const webhook = await deps.webhooks.findByToken(req.params.token ?? "");
      if (!webhook) throw new ApiError(404, "Webhook no encontrado.");

      const ok = await verifyPin(pin, webhook.pinHash);
      if (!ok) throw new ApiError(401, "PIN incorrecto.");

      const jwt = signWebhookToken({
        webhookId: webhook.id,
        token: webhook.token,
      });
      res.json({ token: jwt, webhook: toSafeWebhook(webhook) });
    }),
  );

  router.post(
    "/:token/protect",
    asyncHandler(async (req, res) => {
      const { pin } = unlockSchema.parse(req.body);
      const webhook = await deps.webhooks.findByToken(req.params.token ?? "");
      if (!webhook) throw new ApiError(404, "Webhook no encontrado.");
      if (webhook.pinHash) {
        const ok = await verifyPin(pin, webhook.pinHash);
        if (!ok) throw new ApiError(401, "PIN incorrecto.");
      } else {
        const pinHash = await hashPin(pin);
        await deps.webhooks.protect(webhook.token, pinHash);
      }
      const jwt = signWebhookToken({
        webhookId: webhook.id,
        token: webhook.token,
      });
      res.json({ token: jwt, webhook: toSafeWebhook(webhook) });
    }),
  );

  router.patch(
    "/:token/response",
    auth,
    asyncHandler(async (req, res) => {
      const parsed = responseSchema.parse(req.body);
      const updated = await deps.webhooks.updateResponse(req.webhook!.token, {
        status: parsed.status,
        contentType: parsed.contentType,
        headers: parsed.headers,
        body: parsed.body,
      });
      if (!updated) throw new ApiError(404, "Webhook no encontrado.");
      res.json({ webhook: toSafeWebhook(updated) });
    }),
  );

  const updateSchema = z.object({
    name: z.string().trim().max(80).optional().nullable(),
  });

  router.patch(
    "/:token",
    auth,
    asyncHandler(async (req, res) => {
      const input = updateSchema.parse(req.body);
      const updated = await deps.webhooks.update(req.webhook!.token, input);
      if (!updated) throw new ApiError(404, "Webhook no encontrado.");
      res.json({ webhook: toSafeWebhook(updated) });
    }),
  );

  router.delete(
    "/:token",
    auth,
    asyncHandler(async (req, res) => {
      const deleted = await deps.webhooks.delete(req.params.token ?? "");
      if (!deleted) throw new ApiError(404, "Webhook no encontrado.");
      res.json({ deleted: true });
    }),
  );

  return router;
}
