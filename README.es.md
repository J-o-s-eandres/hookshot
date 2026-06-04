# HookShot

> Inspector de webhooks en tiempo real — un *webhook.site con esteroides*.

Crea una URL única, recibe **cualquier** petición HTTP y obsérvala **en vivo**.
Configura la respuesta que devuelve al emisor, protege el historial con un
**PIN** (que emite un **JWT**) y depura integraciones sin fricción.

![stack](https://img.shields.io/badge/Node-20-green) ![stack](https://img.shields.io/badge/React-18-blue) ![db](https://img.shields.io/badge/SQLite%E2%86%92PostgreSQL-knex-orange)
[![GitHub](https://img.shields.io/badge/GitHub-J--o--s--eandres/hookshot-181717?logo=github)](https://github.com/J-o-s-eandres/hookshot)
[![npm](https://img.shields.io/badge/npm-@hookshot_cli/cli-CB3837?logo=npm)](https://www.npmjs.com/package/@hookshot_cli/cli)

## Características

- **Captura total**: método, ruta, query, headers, body crudo, IP, tamaño y fecha.
- **Tiempo real (SSE)**: las peticiones aparecen al instante en el inspector.
- **Respuesta personalizada** por webhook: status, content-type, headers y body.
- **Auth PIN + JWT**: PIN por webhook (bcrypt) → JWT de lectura *scoped*.
- **Retención automática**: purga peticiones más viejas que `RETENTION_DAYS`.
- **SQLite en dev, PostgreSQL en prod** con el mismo código (Knex).
- **UI responsive** en modo oscuro (React + Tailwind), layout master-detail.
- **Docker**: todo en pie con un solo comando.

---

## Requisitos

- **Node.js ≥ 20** y npm ≥ 9 (para desarrollo local), **o**
- **Docker** + **Docker Compose** (para levantar todo con un comando).

---

## Inicio rápido (desarrollo local)

```bash
# 1) Instalar dependencias de ambos workspaces
npm install

# 2) Configurar entorno
cp .env.example .env      # en Windows PowerShell: Copy-Item .env.example .env
#   (edita JWT_SECRET; los valores por defecto sirven para dev)

# 3) Arrancar server (http://localhost:3000) + frontend (http://localhost:5173)
npm run dev
```

Abre **http://localhost:5173**. Crea un webhook, copia su URL
(`http://localhost:3000/h/<token>`) y envíale una petición:

```bash
curl -X POST http://localhost:3000/h/<token>/ejemplo \
  -H "Content-Type: application/json" \
  -d '{"hola":"mundo"}'
```

La verás aparecer en vivo en el inspector. Para ver el historial te pedirá el
**PIN** que definiste al crear el webhook.

> En desarrollo, Vite (5173) hace de proxy de `/api` y `/h` hacia el server
> (3000), así que puedes usar cualquiera de los dos puertos.

### Comandos útiles

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | server + frontend con recarga en caliente |
| `npm test` | tests del backend (Vitest + Supertest) |
| `npm run build` | build de producción (web + server) |
| `npm start` | arranca el server compilado (sirve API **y** el frontend) |
| `npm -w server run migrate` | aplica migraciones manualmente |

---

## Levantar todo con Docker (un comando)

```bash
docker compose up --build
```

Esto construye la imagen, arranca **PostgreSQL** y la **app**, corre las
migraciones automáticamente y deja HookShot en **http://localhost:3000**.

Para producción, crea un `.env` junto al `docker-compose.yml` y sobreescribe al
menos el secreto:

```env
JWT_SECRET=un-secreto-largo-y-aleatorio
POSTGRES_PASSWORD=una-password-fuerte
```

Parar y limpiar:

```bash
docker compose down          # detiene los contenedores
docker compose down -v       # además borra el volumen de Postgres
```

---

## Exponer a internet con ngrok

Para recibir webhooks de servicios externos (Stripe, GitHub, etc.) necesitas una
URL pública. [ngrok](https://ngrok.com) crea un túnel a tu puerto local:

```bash
# Con el server corriendo en el puerto 3000:
ngrok http 3000
```

ngrok te dará una URL como `https://abc123.ngrok-free.app`. La URL de ingesta de
tu webhook será entonces:

```
https://abc123.ngrok-free.app/h/<token>
```

Configura esa URL en el servicio externo. HookShot respeta `X-Forwarded-For`
(tiene `trust proxy` activado), por lo que la IP capturada será la real del
emisor y no la del túnel.

> Si usas Vite en dev (5173), apunta ngrok al **3000** (el server), no al 5173:
> la ingesta vive en el server.

---

## Túnel local sin ngrok (CLI)

HookShot incluye un CLI que reenvía los webhooks recibidos directamente a tu
puerto local, en vivo — sin ngrok ni túneles externos:

```bash
# crear un webhook
npx @hookshot_cli/cli create --pin 1234

# arrancar el túnel
npx @hookshot_cli/cli listen \
  --token <token-del-webhook> \
  --pin 1234 \
  --target http://localhost:8080
```

Cada petición que llegue a tu webhook se reenvía a `http://localhost:8080`
conservando method, ruta, query, headers y body, y la verás loguearse:

```
16:45:14  POST  /pedido  → 200  18ms
```

El PIN también puede ir en `HOOKSHOT_PIN` y el servidor en `HOOKSHOT_SERVER`
(default `http://localhost:3000`). El CLI no tiene dependencias de runtime.

> Si HookShot corre en Docker y tu app local está en el host, el CLI debe
> ejecutarse **en el host** (alcanza `localhost` del host directamente).

---

## Pasar a PostgreSQL en producción

No hay que cambiar **nada** de código: Knex usa el mismo SQL en ambos motores.
Solo cambia las variables de entorno:

```env
DB_CLIENT=pg
DATABASE_URL=postgres://usuario:password@host:5432/basededatos
```

Al arrancar, el server corre las migraciones automáticamente (idempotentes).
Para ejecutarlas a mano:

```bash
DB_CLIENT=pg DATABASE_URL=postgres://... npm -w server run migrate:prod
```

El `docker-compose.yml` ya viene configurado con `DB_CLIENT=pg` apuntando al
servicio `postgres`, así que el camino a producción es el flujo de Docker.

---

## Variables de entorno

Todas se documentan en [`.env.example`](./.env.example):

| Var | Default | Descripción |
|-----|---------|-------------|
| `PORT` | `3000` | Puerto del server |
| `NODE_ENV` | `development` | `development` \| `production` |
| `DB_CLIENT` | `better-sqlite3` | `better-sqlite3` \| `pg` |
| `SQLITE_FILE` | `./data/hookshot.sqlite` | Archivo SQLite (dev) |
| `DATABASE_URL` | — | Conexión PostgreSQL (prod) |
| `JWT_SECRET` | (dev inseguro) | Secreto de firma JWT — **obligatorio en prod** |
| `JWT_EXPIRES` | `24h` | Expiración del JWT |
| `RETENTION_DAYS` | `7` | Días de retención de peticiones |
| `MAX_BODY_BYTES` | `1048576` | Tamaño máximo del body capturado (1 MB) |

---

## API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/webhooks` | — | Crear webhook (`{ name?, pin }`) |
| `GET` | `/api/webhooks/:token` | — | Metadatos públicos |
| `POST` | `/api/webhooks/:token/unlock` | PIN | Validar PIN → JWT |
| `PATCH` | `/api/webhooks/:token/response` | JWT | Editar respuesta personalizada |
| `GET` | `/api/webhooks/:token/requests` | JWT | Listar peticiones (paginado) |
| `GET` | `/api/webhooks/:token/requests/:id` | JWT | Detalle de una petición |
| `DELETE` | `/api/webhooks/:token/requests/:id` | JWT | Borrar una |
| `DELETE` | `/api/webhooks/:token/requests` | JWT | Vaciar historial |
| `GET` | `/api/webhooks/:token/stream?token=<jwt>` | JWT | Stream SSE en vivo |
| `ANY` | `/h/:token/*` | — | **Ingesta** (captura + respuesta personalizada) |

---

## Licencia

MIT.

---

## English version

See [`README.md`](./README.md) for the English version of this document.
