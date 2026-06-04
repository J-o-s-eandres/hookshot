import type { Webhook } from "../db/webhooks.repo.js";

export interface SafeWebhook {
  token: string;
  name: string | null;
  createdAt: string;
  expiresAt: string | null;
  sessionId: string | null;
  response: Webhook["response"];
}

export function toSafeWebhook(w: Webhook): SafeWebhook {
  return {
    token: w.token,
    name: w.name,
    createdAt: w.createdAt,
    expiresAt: w.expiresAt,
    sessionId: w.sessionId,
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

export interface SessionWebhook {
  id: string;
  token: string;
  name: string | null;
  createdAt: string;
  expiresAt: string | null;
  hasPin: boolean;
}

export function toSessionWebhook(w: Webhook): SessionWebhook {
  return {
    id: w.id,
    token: w.token,
    name: w.name,
    createdAt: w.createdAt,
    expiresAt: w.expiresAt,
    hasPin: Boolean(w.pinHash),
  };
}
