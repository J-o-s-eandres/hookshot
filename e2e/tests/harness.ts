/**
 * Harness e2e: arranca el server REAL compilado en un puerto libre con SQLite
 * temporal, y ofrece utilidades para ejercerlo por HTTP, levantar destinos
 * efímeros y leer el stream SSE.
 *
 * Importante: usa siempre un puerto dinámico (nunca 3000) para no chocar con la
 * instancia del usuario.
 */
import { spawn, type ChildProcess } from "node:child_process";
import http from "node:http";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const serverEntry = path.resolve(repoRoot, "server/dist/server.js");
const cliEntry = path.resolve(repoRoot, "cli/dist/index.js");
const tmpDir = path.resolve(repoRoot, "e2e/.tmp");

/** Encuentra un puerto TCP libre. */
export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
}

export interface RunningServer {
  base: string;
  stop: () => Promise<void>;
}

/** Arranca el server compilado y espera a que /healthz responda 200. */
export async function startServer(): Promise<RunningServer> {
  if (!fs.existsSync(serverEntry)) {
    throw new Error(
      `No existe ${serverEntry}. Ejecuta 'npm run build' antes de los e2e.`,
    );
  }
  fs.mkdirSync(tmpDir, { recursive: true });

  const port = await freePort();
  const sqliteFile = path.join(tmpDir, `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}.sqlite`);

  const child = spawn(process.execPath, [serverEntry], {
    cwd: path.resolve(repoRoot, "server"),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "test",
      JWT_SECRET: "e2e-secret",
      DB_CLIENT: "better-sqlite3",
      SQLITE_FILE: sqliteFile,
      WEB_DIST: path.join(tmpDir, "no-web"), // sin frontend en e2e
      RETENTION_DAYS: "7",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let logs = "";
  child.stdout.on("data", (d) => (logs += d.toString()));
  child.stderr.on("data", (d) => (logs += d.toString()));

  const base = `http://localhost:${port}`;
  const deadline = Date.now() + 15_000;
  let up = false;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/healthz`);
      if (res.ok) {
        up = true;
        break;
      }
    } catch {
      /* todavía no escucha */
    }
    await sleep(250);
  }
  if (!up) {
    child.kill();
    throw new Error(`El server no arrancó a tiempo. Logs:\n${logs}`);
  }

  const stop = async () => {
    child.kill();
    await sleep(200);
    for (const suffix of ["", "-journal", "-wal", "-shm"]) {
      try {
        fs.rmSync(sqliteFile + suffix, { force: true });
      } catch {
        /* no-op */
      }
    }
  };

  return { base, stop };
}

export interface Echo {
  port: number;
  last: () => EchoRequest | null;
  setStatus: (status: number) => void;
  close: () => void;
}

export interface EchoRequest {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: string;
}

/** Servidor destino efímero que registra la última petición recibida. */
export async function startEcho(initialStatus = 200): Promise<Echo> {
  let last: EchoRequest | null = null;
  let status = initialStatus;
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      last = { method: req.method ?? "", url: req.url ?? "", headers: req.headers, body };
      res.writeHead(status);
      res.end("ok");
    });
  });
  const port = await new Promise<number>((resolve) => {
    server.listen(0, () => resolve((server.address() as net.AddressInfo).port));
  });
  return {
    port,
    last: () => last,
    setStatus: (s) => {
      status = s;
    },
    close: () => server.close(),
  };
}

/** POST/GET helpers que devuelven {status, body}. */
export async function http_(
  base: string,
  method: string,
  pathname: string,
  opts: { body?: unknown; jwt?: string } = {},
): Promise<{ status: number; body: any; headers: Headers }> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.jwt) headers["Authorization"] = `Bearer ${opts.jwt}`;
  const res = await fetch(`${base}${pathname}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

export async function createWebhook(base: string, pin = "1234"): Promise<string> {
  const r = await http_(base, "POST", "/api/webhooks", { body: { name: "e2e", pin } });
  if (r.status !== 201) throw new Error(`createWebhook falló: ${r.status}`);
  return r.body.webhook.token as string;
}

export async function unlock(base: string, token: string, pin = "1234"): Promise<string> {
  const r = await http_(base, "POST", `/api/webhooks/${token}/unlock`, { body: { pin } });
  if (r.status !== 200) throw new Error(`unlock falló: ${r.status}`);
  return r.body.token as string;
}

/** Abre el SSE y resuelve con el primer evento `request` (o null por timeout). */
export async function readSseRequest(
  base: string,
  token: string,
  jwt: string,
  timeoutMs = 5000,
): Promise<any | null> {
  const res = await fetch(
    `${base}/api/webhooks/${token}/stream?token=${encodeURIComponent(jwt)}`,
    { headers: { Accept: "text/event-stream" } },
  );
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        if (block.includes("event: request")) {
          const m = block.match(/data: (.*)/);
          if (m) return JSON.parse(m[1]!);
        }
      }
    }
    return null;
  } finally {
    await reader.cancel().catch(() => {});
  }
}

export function spawnCli(args: string[]): ChildProcess {
  return spawn(process.execPath, [cliEntry, ...args], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
