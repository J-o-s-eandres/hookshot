# HookShot

> Real-time webhook inspector — a *webhook.site on steroids*.

Create a unique URL, receive **any** HTTP request and watch it **live**.
Configure the response sent back to the sender, protect the history with a
**PIN** (issuing a **JWT**), and debug integrations without friction.

![stack](https://img.shields.io/badge/Node-20-green) ![stack](https://img.shields.io/badge/React-18-blue) ![db](https://img.shields.io/badge/SQLite%E2%86%92PostgreSQL-knex-orange)
[![GitHub](https://img.shields.io/badge/GitHub-J--o--s--eandres/hookshot-181717?logo=github)](https://github.com/J-o-s-eandres/hookshot)
[![npm](https://img.shields.io/badge/npm-@hookshot_cli/cli-CB3837?logo=npm)](https://www.npmjs.com/package/@hookshot_cli/cli)

## Features

- **Full capture**: method, path, query, headers, raw body, IP, size and timestamp.
- **Real-time (SSE)**: requests appear instantly in the inspector.
- **Custom response** per webhook: status, content-type, headers and body.
- **Auth PIN + JWT**: per-webhook PIN (bcrypt) → scoped read JWT.
- **Auto retention**: purges requests older than `RETENTION_DAYS`.
- **SQLite in dev, PostgreSQL in prod** with the same code (Knex).
- **Dark mode UI** (React + Tailwind), master-detail layout.
- **Docker**: everything up with a single command.

---

## Requirements

- **Node.js ≥ 20** and npm ≥ 9 (for local development), **or**
- **Docker** + **Docker Compose** (to run everything with one command).

---

## Quick start (local dev)

```bash
# 1) Install dependencies for both workspaces
npm install

# 2) Configure environment
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
#   (edit JWT_SECRET; defaults work for dev)

# 3) Start server (http://localhost:3000) + frontend (http://localhost:5173)
npm run dev
```

Open **http://localhost:5173**. Create a webhook, copy its URL
(`http://localhost:3000/h/<token>`) and send it a request:

```bash
curl -X POST http://localhost:3000/h/<token>/example \
  -H "Content-Type: application/json" \
  -d '{"hello":"world"}'
```

It appears live in the inspector. To view the history, enter the **PIN** you
set when creating the webhook.

> In development, Vite (5173) proxies `/api` and `/h` to the server (3000),
> so you can use either port.

### Useful commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | server + frontend with hot reload |
| `npm test` | backend tests (Vitest + Supertest) |
| `npm run build` | production build (web + server) |
| `npm start` | runs compiled server (serves API **and** frontend) |
| `npm -w server run migrate` | run migrations manually |

---

## Docker (one command)

```bash
docker compose up --build
```

This builds the image, starts **PostgreSQL** and the **app**, runs migrations
automatically, and leaves HookShot at **http://localhost:3000**.

For production, create a `.env` next to `docker-compose.yml` and override at
least the secret:

```env
JWT_SECRET=a-long-random-secret
POSTGRES_PASSWORD=a-strong-password
```

Stop and clean up:

```bash
docker compose down          # stops containers
docker compose down -v       # also removes Postgres volume
```

---

## Expose to the internet with ngrok

To receive webhooks from external services (Stripe, GitHub, etc.) you need a
public URL. [ngrok](https://ngrok.com) creates a tunnel to your local port:

```bash
# With the server running on port 3000:
ngrok http 3000
```

ngrok gives you a URL like `https://abc123.ngrok-free.app`. Your webhook's
ingest URL becomes:

```
https://abc123.ngrok-free.app/h/<token>
```

Configure that URL in the external service. HookShot respects `X-Forwarded-For`
(`trust proxy` is enabled), so the captured IP is the real sender's IP, not
the tunnel's.

> If you use Vite in dev (5173), point ngrok at **3000** (the server), not
> 5173 — ingestion lives on the server.

---

## Local tunnel without ngrok (CLI)

HookShot includes a CLI that forwards received webhooks directly to your
local port, live — no ngrok or external tunnels:

```bash
# create a webhook
npx @hookshot_cli/cli create --pin 1234

# start the tunnel
npx @hookshot_cli/cli listen \
  --token <webhook-token> \
  --pin 1234 \
  --target http://localhost:8080
```

Each request is forwarded to `http://localhost:8080` preserving method, path,
query, headers and body, and is logged to the terminal:

```
16:45:14  POST  /order  → 200  18ms
```

The PIN can also go in `HOOKSHOT_PIN` and the server URL in `HOOKSHOT_SERVER`
(default `http://localhost:3000`). The CLI has zero runtime dependencies.

> If HookShot runs on Docker and your local app is on the host, run the CLI
> **on the host** (it reaches `localhost` directly).

---

## Switching to PostgreSQL in production

**Zero** code changes: Knex uses the same SQL on both engines. Just change the
environment variables:

```env
DB_CLIENT=pg
DATABASE_URL=postgres://user:password@host:5432/database
```

On startup, the server runs migrations automatically (idempotent). To run them
manually:

```bash
DB_CLIENT=pg DATABASE_URL=postgres://... npm -w server run migrate:prod
```

The `docker-compose.yml` already uses `DB_CLIENT=pg` pointing to the `postgres`
service, so going to production is the Docker flow.

---

## Environment variables

All documented in [`.env.example`](./.env.example):

| Var | Default | Description |
|-----|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | `development` \| `production` |
| `DB_CLIENT` | `better-sqlite3` | `better-sqlite3` \| `pg` |
| `SQLITE_FILE` | `./data/hookshot.sqlite` | SQLite file path (dev) |
| `DATABASE_URL` | — | PostgreSQL connection string (prod) |
| `JWT_SECRET` | (insecure dev) | JWT signing secret — **required in prod** |
| `JWT_EXPIRES` | `24h` | JWT expiration |
| `RETENTION_DAYS` | `7` | Request retention in days |
| `MAX_BODY_BYTES` | `1048576` | Max captured body size (1 MB) |

---

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/webhooks` | — | Create webhook (`{ name?, pin }`) |
| `GET` | `/api/webhooks/:token` | — | Public metadata |
| `POST` | `/api/webhooks/:token/unlock` | PIN | Validate PIN → JWT |
| `PATCH` | `/api/webhooks/:token/response` | JWT | Edit custom response |
| `GET` | `/api/webhooks/:token/requests` | JWT | List requests (paginated) |
| `GET` | `/api/webhooks/:token/requests/:id` | JWT | Request detail |
| `DELETE` | `/api/webhooks/:token/requests/:id` | JWT | Delete one |
| `DELETE` | `/api/webhooks/:token/requests` | JWT | Clear history |
| `GET` | `/api/webhooks/:token/stream?token=<jwt>` | JWT | SSE live stream |
| `ANY` | `/h/:token/*` | — | **Ingestion** (capture + custom response) |

---

## License

MIT.

---

## Versión en español

Consulta [`README.es.md`](./README.es.md) para la versión en español de este documento.
