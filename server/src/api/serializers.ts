import type { Webhook } from "../db/webhooks.repo.js";

export interface SafeWebhook {
  token: string;
  name: string | null;
  createdAt: string;
  expiresAt: string | null;
  response: Webhook["response"];
}

export function toSafeWebhook(w: Webhook): SafeWebhook {
  return {
    token: w.token,
    name: w.name,
    createdAt: w.createdAt,
    expiresAt: w.expiresAt,
    response: w.response,
  };
}

export interface PublicWebhook {
  token: string;
  name: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export function toPublicWebhook(w: Webhook): PublicWebhook {
  return { token: w.token, name: w.name, createdAt: w.createdAt, expiresAt: w.expiresAt };
}
