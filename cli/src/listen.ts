import { unlock, openStream, fetchHistory, CliError } from "./client.js";
import { parseSseStream } from "./sse.js";
import { forwardRequest } from "./forward.js";
import { log } from "./log.js";
import type { CapturedRequest } from "./types.js";

export interface ListenOptions {
  server: string;
  token: string;
  pin: string;
  target: string;
  timeoutMs: number;
  /** Número de peticiones históricas a reenviar antes de conectar el stream. */
  history?: number;
}

/** Arranca el túnel: unlock -> (history) -> stream -> reenvío en vivo, con reconexión. */
export async function listen(
  opts: ListenOptions,
  signal: AbortSignal,
): Promise<void> {
  log.banner(opts.server, opts.token, opts.target);

  let backoff = 1000;
  while (!signal.aborted) {
    try {
      const jwt = await unlock(opts.server, opts.token, opts.pin);

      // Historial: reenviar peticiones anteriores al stream.
      if (opts.history && opts.history > 0) {
        const history = await fetchHistory(opts.server, opts.token, jwt, opts.history);
        if (history.length > 0) {
          log.info(`Reenviando ${history.length} petición(es) del historial\u2026`);
          for (const captured of history.reverse()) {
            if (signal.aborted) break;
            const result = await forwardRequest(captured, opts.target, {
              timeoutMs: opts.timeoutMs,
            });
            log.forwarded(captured.method, captured.path, result.status, result.latencyMs);
            if (result.error) log.error(`  ${result.error}`);
          }
        }
      }

      const res = await openStream(opts.server, opts.token, jwt);
      backoff = 1000; // conexión exitosa: reset del backoff

      for await (const ev of parseSseStream(res.body!)) {
        if (signal.aborted) break;
        if (ev.event !== "request") continue;
        let captured: CapturedRequest;
        try {
          captured = JSON.parse(ev.data) as CapturedRequest;
        } catch {
          continue;
        }
        const result = await forwardRequest(captured, opts.target, {
          timeoutMs: opts.timeoutMs,
        });
        log.forwarded(captured.method, captured.path, result.status, result.latencyMs);
        if (result.error) log.error(`  ${result.error}`);
      }
    } catch (err) {
      if (err instanceof CliError) {
        // PIN/token inválidos: no tiene sentido reintentar en bucle.
        if (/PIN|token inválido/i.test(err.message)) {
          log.error(err.message);
          return;
        }
        log.error(err.message);
      } else if (err instanceof Error) {
        log.error(err.message);
      }
    }

    if (signal.aborted) break;
    log.info(`Reconectando en ${backoff / 1000}s…`);
    await sleep(backoff, signal);
    backoff = Math.min(backoff * 2, 30000);
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
}
