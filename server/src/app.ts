/**
 * Construcción de la aplicación Express.
 *
 * Orden de montaje (CRÍTICO):
 *   1. Cabeceras de seguridad.
 *   2. `/api/*`        → API (parser JSON), rutas de webhooks/requests/SSE.
 *   3. `/h/:token`     → ingesta (parser RAW que captura cualquier body).
 *   4. estáticos SPA   → sirve el build del frontend + fallback a index.html.
 *   5. manejador de errores.
 *
 * Los parsers se montan POR RUTA: el JSON solo en `/api` y el RAW solo en la
 * ingesta. Si pusiéramos `express.json()` global, consumiría el body antes de
 * que la ingesta pudiera capturarlo crudo.
 */
import express, { type Express, Router } from "express";
import fs from "node:fs";
import path from "node:path";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { config } from "./config.js";
import type { AppDeps } from "./deps.js";
import { webhooksRouter } from "./api/webhooks.routes.js";
import { requestsRouter } from "./api/requests.routes.js";
import { sseRouter } from "./api/sse.routes.js";
import { createIngestHandler } from "./ingest/handler.js";
import { errorMiddleware } from "./api/errors.js";

/** Cabeceras de seguridad mínimas, sin dependencias extra. */
function securityHeaders(): express.RequestHandler {
  return (_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  };
}

/** Localiza el directorio del build del frontend, si existe. */
function resolveWebDist(): string | null {
  const candidates = [
    config.WEB_DIST,
    path.resolve(process.cwd(), "web/dist"),
    path.resolve(process.cwd(), "../web/dist"),
  ].filter((p): p is string => Boolean(p));

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) return dir;
  }
  return null;
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.disable("x-powered-by");
  // Necesario para que `req.ip` respete X-Forwarded-For tras un proxy/ngrok.
  app.set("trust proxy", true);
  app.use(securityHeaders());

  // ── Logging (morgan) ─────────────────────────────────────────────────────────
  if (!config.isTest) {
    app.use(morgan(config.isProduction ? "combined" : "dev"));
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────────
  const apiLimiter = rateLimit({
    windowMs: 60_000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: { error: "Demasiadas peticiones. Intenta de nuevo en un minuto." },
  });

  // ── Healthcheck ────────────────────────────────────────────────────────────
  app.get("/healthz", (_req, res) => res.json({ ok: true }));

  // ── API (JSON) ──────────────────────────────────────────────────────────────
  const api = Router();
  api.use(apiLimiter);
  api.use(express.json({ limit: "1mb" }));
  api.use(express.urlencoded({ extended: true }));
  api.use("/webhooks", webhooksRouter(deps));
  api.use("/webhooks/:token/requests", requestsRouter(deps));
  api.use("/webhooks", sseRouter(deps)); // define /:token/stream
  app.use("/api", api);

  // ── Ingesta (RAW: captura cualquier método y body) ───────────────────────────
  const rawParser = express.raw({
    type: () => true, // fuerza a tratar TODO body como binario crudo
    limit: config.MAX_BODY_BYTES,
  });
  const ingest = createIngestHandler(deps);
  app.all("/h/:token", rawParser, ingest);
  app.all("/h/:token/*", rawParser, ingest);

  // ── Frontend estático + fallback SPA ─────────────────────────────────────────
  const webDist = resolveWebDist();
  if (webDist) {
    app.use(express.static(webDist));
    // Cualquier ruta no-API y no-ingesta devuelve el index.html (SPA routing).
    app.get(/^(?!\/api|\/h\/).*/, (_req, res) => {
      res.sendFile(path.join(webDist, "index.html"));
    });
  } else {
    console.warn(
      "[app] No se encontró el build del frontend (web/dist). " +
        "En desarrollo, usa Vite (npm run dev). Define WEB_DIST en producción.",
    );
  }

  // ── Errores ───────────────────────────────────────────────────────────────────
  app.use(errorMiddleware);
  return app;
}
