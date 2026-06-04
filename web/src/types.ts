/**
 * Tipos compartidos con el backend (espejo del contrato de la API).
 * Mantener sincronizados con `server/src/...`.
 */

export interface ResponseConfig {
  status: number;
  contentType: string;
  headers: Record<string, string>;
  body: string;
}

/** Webhook tal como lo devuelve la API al dueño autenticado. */
export interface SafeWebhook {
  token: string;
  name: string | null;
  createdAt: string;
  response: ResponseConfig;
}

/** Metadatos públicos de un webhook. */
export interface PublicWebhook {
  token: string;
  name: string | null;
  createdAt: string;
}

/** Petición capturada. */
export interface CapturedRequest {
  id: string;
  webhookId: string;
  method: string;
  path: string;
  query: Record<string, unknown>;
  headers: Record<string, string>;
  body: string;
  contentType: string | null;
  size: number;
  ip: string | null;
  createdAt: string;
}
