export interface ResponseConfig {
  status: number;
  contentType: string;
  headers: Record<string, string>;
  body: string;
}

export interface SafeWebhook {
  token: string;
  name: string | null;
  createdAt: string;
  expiresAt: string | null;
  sessionId: string | null;
  response: ResponseConfig;
}

export interface PublicWebhook {
  token: string;
  name: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface SessionWebhook {
  id: string;
  token: string;
  name: string | null;
  createdAt: string;
  expiresAt: string | null;
  hasPin: boolean;
}

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
