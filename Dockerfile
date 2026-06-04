# ──────────────────────────────────────────────────────────────────────────────
# HookShot — imagen multi-stage
#
#  Stage 1 (build):   instala TODO (incl. devDeps), compila el frontend (Vite)
#                     y el backend (tsc).
#  Stage 2 (runtime): imagen ligera con solo las dependencias de producción del
#                     server + los artefactos compilados. Sirve API + frontend.
#
# Usamos `bookworm-slim` (glibc) en lugar de Alpine (musl) para que los binarios
# precompilados de better-sqlite3 y pg se instalen sin necesidad de compilador.
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Copiamos los manifiestos primero para aprovechar la caché de capas.
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/

# Instala dependencias de todos los workspaces (incluye devDeps para compilar).
RUN npm ci

# Copiamos el código y compilamos.
COPY tsconfig.base.json ./
COPY server ./server
COPY web ./web
RUN npm run build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Solo dependencias de producción del workspace `server`.
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN npm ci --omit=dev -w server

# Artefactos compilados desde el stage de build.
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/web/dist ./web/dist

# Ruta del frontend a servir y carpeta de datos (por si se usa SQLite).
ENV WEB_DIST=/app/web/dist
ENV SQLITE_FILE=/app/data/hookshot.sqlite
RUN mkdir -p /app/data

EXPOSE 3000

# Healthcheck usando el fetch nativo de Node 20 (la imagen no trae curl/wget).
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# El server corre las migraciones al arrancar (idempotente) y luego escucha.
WORKDIR /app/server
CMD ["node", "dist/server.js"]
