import type { CapturedRequest } from "./types.js";

export interface ForwardOptions {
  timeoutMs: number;
}

export interface ForwardResult {
  status: number | null;
  latencyMs: number;
  error: string | null;
}

// Cabeceras que NO reenviamos: las recalcula el cliente HTTP.
const STRIP = /^(host|content-length|connection|transfer-encoding)$/i;
const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

/** Construye la query string a partir del objeto `query` capturado. */
function buildQuery(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (Array.isArray(v)) for (const item of v) params.append(k, String(item));
    else params.append(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** Reenvía una petición capturada al `target` local. */
export async function forwardRequest(
  captured: CapturedRequest,
  target: string,
  opts: ForwardOptions,
): Promise<ForwardResult> {
  const base = target.replace(/\/+$/, "");
  const path = captured.path.startsWith("/") ? captured.path : `/${captured.path}`;
  const url = `${base}${path}${buildQuery(captured.query)}`;

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(captured.headers)) {
    if (!STRIP.test(k)) headers[k] = v;
  }

  const method = captured.method.toUpperCase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  const started = performance.now();

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: METHODS_WITHOUT_BODY.has(method) ? undefined : captured.body,
      signal: controller.signal,
      redirect: "manual",
    });
    // Drenamos el cuerpo para liberar el socket.
    await res.arrayBuffer();
    return {
      status: res.status,
      latencyMs: Math.round(performance.now() - started),
      error: null,
    };
  } catch (err) {
    const message = controller.signal.aborted
      ? `Timeout tras ${opts.timeoutMs} ms`
      : err instanceof Error
        ? err.message
        : String(err);
    return {
      status: null,
      latencyMs: Math.round(performance.now() - started),
      error: message,
    };
  } finally {
    clearTimeout(timer);
  }
}
