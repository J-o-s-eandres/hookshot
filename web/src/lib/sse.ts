/**
 * Suscripción al stream SSE de un webhook.
 *
 * `EventSource` reconecta solo, pero solo si el endpoint sigue respondiendo;
 * si el JWT expira, el servidor cierra y el navegador reintentaría en bucle,
 * por eso exponemos callbacks de estado para que la UI pueda reaccionar.
 */
import type { CapturedRequest } from "../types";

export interface SseCallbacks {
  onRequest: (req: CapturedRequest) => void;
  onOpen?: () => void;
  onError?: () => void;
  onUnauthorized?: () => void;
}

export interface SseSubscription {
  close: () => void;
}

export function subscribeToWebhook(
  token: string,
  jwt: string,
  callbacks: SseCallbacks,
): SseSubscription {
  const url = `/api/webhooks/${token}/stream?token=${encodeURIComponent(jwt)}`;
  const source = new EventSource(url);

  source.addEventListener("open", () => callbacks.onOpen?.());

  source.addEventListener("request", (ev) => {
    try {
      const data = JSON.parse((ev as MessageEvent).data) as CapturedRequest;
      callbacks.onRequest(data);
    } catch {
      /* frame malformado: lo ignoramos */
    }
  });

  source.addEventListener("error", () => {
    if (source.readyState === EventSource.CLOSED) {
      source.close();
      callbacks.onUnauthorized?.();
    }
    callbacks.onError?.();
  });

  return {
    close: () => source.close(),
  };
}
