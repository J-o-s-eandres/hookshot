/**
 * Hub de Server-Sent Events.
 *
 * Mantiene, por cada token de webhook, el conjunto de respuestas HTTP que
 * están escuchando en streaming. Cuando llega una petición nueva a la ingesta,
 * la difundimos a todos los suscriptores de ese webhook.
 *
 * SSE encaja muy bien aquí: es unidireccional (servidor→cliente), atraviesa
 * proxies/ngrok sin configuración especial y reconecta solo desde el navegador.
 */
import type { Response } from "express";

/** Intervalo de keepalive para evitar que proxies corten la conexión. */
const KEEPALIVE_MS = 25_000;

export class SseHub {
  private readonly channels = new Map<string, Set<Response>>();
  private readonly keepalives = new Map<Response, NodeJS.Timeout>();

  /**
   * Registra una respuesta como suscriptor del canal `token`.
   * Configura las cabeceras SSE, manda un comentario inicial y limpia al cerrar.
   */
  subscribe(token: string, res: Response): void {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Desactiva el buffering de nginx si estuviera delante.
      "X-Accel-Buffering": "no",
    });
    // Comentario inicial: abre el stream en el cliente de inmediato.
    res.write(": conectado a HookShot\n\n");

    let set = this.channels.get(token);
    if (!set) {
      set = new Set<Response>();
      this.channels.set(token, set);
    }
    set.add(res);

    // Ping periódico (comentario SSE) para mantener viva la conexión.
    const timer = setInterval(() => {
      res.write(": ping\n\n");
    }, KEEPALIVE_MS);
    this.keepalives.set(res, timer);

    // Limpieza cuando el cliente se desconecta.
    res.on("close", () => this.unsubscribe(token, res));
  }

  /** Elimina un suscriptor y libera su keepalive. */
  unsubscribe(token: string, res: Response): void {
    const timer = this.keepalives.get(res);
    if (timer) {
      clearInterval(timer);
      this.keepalives.delete(res);
    }
    const set = this.channels.get(token);
    if (set) {
      set.delete(res);
      if (set.size === 0) this.channels.delete(token);
    }
  }

  /** Difunde un evento con nombre y payload JSON a los suscriptores del token. */
  broadcast(token: string, event: string, data: unknown): void {
    const set = this.channels.get(token);
    if (!set || set.size === 0) return;
    const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of set) {
      res.write(frame);
    }
  }

  /** Número de suscriptores activos en un token (útil para tests/diagnóstico). */
  subscriberCount(token: string): number {
    return this.channels.get(token)?.size ?? 0;
  }
}
